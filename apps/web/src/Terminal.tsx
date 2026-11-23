import {
  CORPORATE_NETWORK_EVENT,
  publishCorporateNetwork,
} from "./linux-network/useCorporateNetwork";
import type {
  LinuxNetworkView,
  WorkstationReply,
} from "../../../packages/linux-contracts";
import TerminalCopyControl from "./terminal/TerminalCopyControl";
import { useEffect, useRef, useState } from "react";
import { Terminal as XTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { api, post } from "./api";
import { WEB_CHALLENGE_ID, isWebChallenge } from "./web-lab/catalog";
export default function Terminal({
  challengeId,
  initialCommand,
  workstation = false,
}: {
  challengeId: string;
  initialCommand?: string;
  workstation?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [copyTerminal, setCopyTerminal] = useState<XTerminal | null>(null);
  const [connectionLabel, setConnectionLabel] = useState("");
  const [running, setRunning] = useState(workstation);
  const [clipboardError, setClipboardError] = useState("");
  const paste = useRef<(() => void) | null>(null);
  const challengeContext = useRef(challengeId);
  challengeContext.current = challengeId;
  useEffect(() => {
    const term = new XTerminal({
      fontFamily: "Consolas, monospace",
      fontSize: 14,
      lineHeight: 1.35,
      cursorBlink: !window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
      theme: {
        background: "#171b25",
        foreground: "#e1e6f1",
        cursor: "#dce8ff",
        selectionBackground: "#3a567b",
      },
      convertEol: true,
      scrollback: 1500,
      wordSeparator: " ()[]',\"`",
      screenReaderMode: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host.current!);
    setCopyTerminal(term);
    let input = "";
    let cwd = "/home/analista";
    let busy = workstation;
    let network: LinuxNetworkView | null = null;
    let networkVersion = 0;
    let password = false;
    let active = true;
    const history: string[] = [];
    let historyIndex = 0;
    const prefix = "\x1b[38;2;94;155;255m└─\x1b[0m$ ";
    const acceptNetwork = (view: LinuxNetworkView) => {
      network = view;
      password = view.password;
      setConnectionLabel(
        view.password
          ? "Autenticación SSH"
          : view.host
            ? `${view.host} · SSH`
            : view.connected
              ? "VPN conectada"
              : "VPN desconectada",
      );
    };
    const prompt = () => {
      if (network?.host || password)
        term.write("\x1b[38;2;110;210;229m" + network!.prompt + "\x1b[0m");
      else
        term.write(
          `\x1b[38;2;94;155;255m┌──(\x1b[38;2;110;210;229manalista㉿seventech\x1b[38;2;94;155;255m)-[\x1b[0m${cwd.replace("/home/analista", "~")}\x1b[38;2;94;155;255m]\x1b[0m\r\n` +
            prefix,
        );
    };
    const redraw = () => {
      term.write("\r\x1b[2K");
      if (network?.host || password)
        term.write("\x1b[38;2;110;210;229m" + network!.prompt + "\x1b[0m");
      else term.write(prefix);
      if (!password) term.write(input);
    };
    term.writeln(
      "\x1b[1;38;2;124;184;255mSeventech CTF\x1b[0m / Estación de investigación 01",
    );
    term.writeln("Escribe help para consultar los comandos disponibles.");
    if (challengeId === WEB_CHALLENGE_ID)
      term.writeln("Herramientas web disponibles: curl · ffuf (ffuf -h)");
    term.writeln(
      "↑ ↓ Historial   ·   Tab Completar archivos   ·   Ctrl+L Limpiar\r\n",
    );
    if (!workstation) prompt();
    const observer = new ResizeObserver(() => {
      try {
        if (active && host.current?.clientWidth && host.current?.clientHeight)
          fit.fit();
      } catch {}
    });
    observer.observe(host.current!);
    const frame = requestAnimationFrame(() => {
      if (active) {
        fit.fit();
        term.focus();
      }
    });
    const execute = async () => {
      busy = true;
      setRunning(true);
      const command = input;
      const version = networkVersion;
      if (input.trim() && !password) {
        history.push(input);
        if (history.length > 150) history.shift();
      }
      historyIndex = history.length;
      term.write("\r\n");
      try {
        const result = workstation
          ? ((await post("/workstation/commands", {
              command,
              cwd,
              challengeId: challengeContext.current,
            })) as WorkstationReply)
          : await post(`/challenges/${challengeContext.current}/commands`, {
              command,
              cwd,
            });
        if (!active) return;
        if (result.windows)
          window.dispatchEvent(
            new CustomEvent("ctf-windows-changed", { detail: result.windows }),
          );
        if (result.ot)
          window.dispatchEvent(
            new CustomEvent("ctf-ot-state", { detail: result.ot }),
          );
        if (result.printed)
          window.dispatchEvent(
            new CustomEvent("ctf-printer-paper", { detail: { printed: true } }),
          );
        cwd = result.cwd;
        if (workstation && version === networkVersion) {
          acceptNetwork(result.network);
          publishCorporateNetwork(result.network);
        }
        if (result.awardedPoints) {
          term.writeln(`+${result.awardedPoints} puntos · progreso guardado`);
          window.dispatchEvent(new Event("ctf-progress-changed"));
        }
        if (result.clear) term.clear();
        else if (result.output) term.writeln(result.output);
      } catch (e) {
        if (active)
          term.writeln(
            e instanceof Error ? e.message : "La terminal perdió la conexión.",
          );
      } finally {
        input = "";
        busy = false;
        if (active) {
          setRunning(false);
          term.write("\r\n");
          prompt();
        }
      }
    };
    const insertText = (data: string) => {
      const text = data
        .replace(/[^\x20-\x7e]/g, "")
        .slice(0, (workstation ? 1024 : 256) - input.length);
      input += text;
      if (!password) term.write(text);
    };
    paste.current = () => {
      if (busy) return;
      setClipboardError("");
      void navigator.clipboard
        .readText()
        .then((text) => {
          if (active && !busy) {
            insertText(text);
            term.focus();
          }
        })
        .catch(() => {
          if (active)
            setClipboardError(
              "Permite el acceso al portapapeles o escribe el texto.",
            );
        });
    };
    term.attachCustomKeyEventHandler((event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "v" &&
        event.type === "keydown"
      ) {
        event.preventDefault();
        paste.current?.();
        return false;
      }
      return true;
    });
    const networkChanged = (event: Event) => {
      if (!workstation) return;
      const view = (event as CustomEvent<LinuxNetworkView>).detail;
      const remote = Boolean(network?.host || password);
      networkVersion++;
      acceptNetwork(view);
      if (remote && !view.host && !view.password) {
        input = "";
        term.writeln("\r\nLa conexión SSH se ha cerrado.");
        if (!busy) prompt();
      }
    };
    if (workstation)
      window.addEventListener(CORPORATE_NETWORK_EVENT, networkChanged);
    const listener = term.onData((data) => {
      if (busy) return;
      if (data === "\r") {
        void execute();
      } else if (data === "\x1b[A" || data === "\x1b[B") {
        if (password) return;
        historyIndex = Math.max(
          0,
          Math.min(history.length, historyIndex + (data === "\x1b[A" ? -1 : 1)),
        );
        input = history[historyIndex] ?? "";
        redraw();
      } else if (data === "\x0c") {
        term.clear();
        term.write("\x1b[H\x1b[2J");
        prompt();
        redraw();
      } else if (data === "\x15") {
        input = "";
        redraw();
      } else if (data === "\t") {
        if (password) return;
        const words = input.split(/\s+/);
        if (words.length === 1) {
          const choices = [
            ...(workstation ? ["domain", "crypto"] : []),
            "help",
            "pwd",
            "ls",
            "cd",
            "cat",
            "clear",
            "whoami",
            "hostname",
            "uname",
            "id",
            "date",
            "echo",
            ...(workstation
              ? [
                  "ssh",
                  "ip",
                  "ping",
                  "nmap",
                  "vpn",
                  "submit",
                  "exit",
                  "man",
                  "win",
                ]
              : []),
            ...(network?.host
              ? [
                  "find",
                  "grep",
                  "sort",
                  "uniq",
                  "file",
                  "strings",
                  "base64",
                  "xxd",
                  "gzip",
                  "sudo",
                  "stat",
                  "reset",
                  "chmod",
                ]
              : []),
            ...(!network?.host && isWebChallenge(challengeContext.current)
              ? ["curl", "codec", "grep"]
              : []),
            ...(challengeContext.current === WEB_CHALLENGE_ID
              ? ["ffuf", "which"]
              : []),
          ].filter((c) => c.startsWith(input));
          if (choices.length === 1) {
            input = choices[0] + " ";
            redraw();
          }
        } else {
          if (network?.host) return;
          const fragment = words[words.length - 1];
          const slash = fragment.lastIndexOf("/");
          const parent = slash >= 0 ? fragment.slice(0, slash + 1) : "";
          const stem = fragment.slice(slash + 1);
          const path = parent
            ? parent.startsWith("/")
              ? parent
              : cwd + "/" + parent
            : cwd;
          busy = true;
          setRunning(true);
          void api<{ entries?: { name: string; type: string }[] }>(
            workstation &&
              (path.includes("/dominio") ||
                challengeContext.current.startsWith("ad-") ||
                challengeContext.current.startsWith("reverse-") ||
                path.includes("/ingenieria-inversa") ||
                challengeContext.current.startsWith("stego-") ||
                path.includes("/esteganografia"))
              ? `/workstation/files?path=${encodeURIComponent(path)}`
              : `/challenges/${challengeContext.current.startsWith("linux-") ? "primer-rastro" : challengeContext.current}/files?path=${encodeURIComponent(path)}`,
          )
            .then((r) => {
              if (!active) return;
              const choices =
                r.entries?.filter((e) => e.name.startsWith(stem)) ?? [];
              if (choices.length === 1) {
                input =
                  input.slice(0, input.length - stem.length) +
                  choices[0].name +
                  (choices[0].type === "directory" ? "/" : "");
                redraw();
              } else if (choices.length > 1) {
                term.write("\r\n");
                term.writeln(
                  choices
                    .map((e) => e.name + (e.type === "directory" ? "/" : ""))
                    .join("    "),
                );
                prompt();
                redraw();
              }
            })
            .catch(() => {})
            .finally(() => {
              busy = false;
              if (active) setRunning(false);
            });
        }
      } else if (data === "\x7f") {
        if (input.length) {
          input = input.slice(0, -1);
          if (!password) term.write("\b \b");
        }
      } else if (data === "\x03") {
        input = "";
        if (password) {
          input = "\u0003";
          void execute();
        } else {
          term.write("^C\r\n");
          prompt();
        }
      } else if (!data.includes("\x1b")) {
        insertText(data);
      }
    });
    if (workstation) {
      const version = networkVersion;
      void api<LinuxNetworkView>("/linux-network")
        .then((view) => {
          if (active && version === networkVersion) acceptNetwork(view);
        })
        .catch((error) => {
          if (active)
            term.writeln(
              error instanceof Error
                ? error.message
                : "No se pudo consultar la conexión.",
            );
        })
        .finally(() => {
          if (active) {
            busy = false;
            setRunning(false);
            prompt();
          }
        });
    }
    if (initialCommand) {
      input = initialCommand;
      term.write(input);
      void execute();
    }
    return () => {
      active = false;
      paste.current = null;
      window.removeEventListener(CORPORATE_NETWORK_EVENT, networkChanged);
      cancelAnimationFrame(frame);
      observer.disconnect();
      listener.dispose();
      term.dispose();
    };
  }, [workstation, initialCommand]);
  return (
    <div className="terminal-workspace" aria-busy={running}>
      <div className="terminal-copy-toolbar">
        <TerminalCopyControl terminal={copyTerminal} />
        {connectionLabel && <span role="status">{connectionLabel}</span>}
        {running && <span>Procesando…</span>}
        <span role="alert">{clipboardError}</span>
        <button
          type="button"
          disabled={running}
          onClick={() => paste.current?.()}
          aria-label="Pegar en la terminal"
        >
          Pegar
        </button>
      </div>
      <div
        className="terminal"
        ref={host}
        aria-label="Terminal del laboratorio Seventech. Escribe help para consultar los comandos."
      />
    </div>
  );
}
