import { useEffect, useRef, useState } from "react";
import { api, post } from "../api";
import { CORPORATE_NETWORK_EVENT } from "../linux-network/useCorporateNetwork";
import type {
  DomainView,
  DomainReply,
} from "../../../../packages/domain-contracts";
const DOMAIN_EVENT = "ctf-domain-changed";
export function useDomainLab(active = true) {
  const [view, setView] = useState<DomainView | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, refresh] = useState(0);
  const alive = useRef(true),
    version = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      version.current++;
    };
  }, []);
  useEffect(() => {
    if (!active) return;
    const current = ++version.current,
      abort = new AbortController();
    void api<DomainView>("/domain", { signal: abort.signal })
      .then((result) => {
        if (!abort.signal.aborted && current === version.current) {
          setView(result);
          setError("");
        }
      })
      .catch((error) => {
        if (!abort.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "No se pudo consultar el dominio.",
          );
      });
    return () => abort.abort();
  }, [active, revision]);
  useEffect(() => {
    const changed = (event: Event) => {
      version.current++;
      setView((event as CustomEvent<DomainView>).detail);
      setError("");
    };
    const vpn = () => refresh((n) => n + 1);
    window.addEventListener(DOMAIN_EVENT, changed);
    window.addEventListener(CORPORATE_NETWORK_EVENT, vpn);
    return () => {
      window.removeEventListener(DOMAIN_EVENT, changed);
      window.removeEventListener(CORPORATE_NETWORK_EVENT, vpn);
    };
  }, []);
  async function send(command: string) {
    if (busy) return null;
    setBusy(true);
    setError("");
    try {
      const result = (await post("/domain/commands", {
        command,
      })) as DomainReply;
      if (alive.current) {
        window.dispatchEvent(
          new CustomEvent(DOMAIN_EVENT, { detail: result.view }),
        );
      }
      return result;
    } catch (error) {
      if (alive.current)
        setError(
          error instanceof Error
            ? error.message
            : "No se pudo completar la operación.",
        );
      return null;
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return { view, error, busy, send, refresh: () => refresh((n) => n + 1) };
}
export const domainCommandText = (values: string[]) =>
  ["domain", ...values.map((v) => JSON.stringify(v))].join(" ");
