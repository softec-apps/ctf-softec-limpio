import { useState } from "react";
import { ShieldCheck, Network, Unplug, TerminalSquare } from "lucide-react";
import { post } from "../api";
import CopyButton from "../web-lab/toolkit/CopyButton";
import {
  useCorporateNetwork,
  publishCorporateNetwork,
} from "./useCorporateNetwork";
import type { LinuxReply } from "../../../../packages/linux-contracts";
import "./linux-network.css";
export default function VpnApplication({
  onTerminal,
}: {
  onTerminal: () => void;
}) {
  const { view, error, refresh } = useCorporateNetwork();
  const [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  async function toggle() {
    if (!view || busy) return;
    setBusy(true);
    setFailure("");
    try {
      const reply = (await post("/linux-network/vpn", {
        connected: !view.connected,
      })) as LinuxReply;
      publishCorporateNetwork(reply.view);
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar la conexión.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="corporate-vpn-app" aria-label="Cliente Seventech VPN">
      <header>
        <ShieldCheck size={30} />
        <div>
          <h1>Seventech VPN</h1>
          <p>Acceso privado a la red corporativa</p>
        </div>
      </header>
      <div className="corporate-vpn-profile">
        <div className="corporate-vpn-profile-heading">
          <Network size={21} />
          <strong>Red corporativa</strong>
          <span role="status">
            {busy
              ? view?.connected
                ? "Desconectando…"
                : "Conectando…"
              : view?.connected
                ? "Conectada"
                : "Desconectada"}
          </span>
        </div>
        <dl>
          <div>
            <dt>Perfil</dt>
            <dd>Seventech · Infraestructura</dd>
          </div>
          <div>
            <dt>Segmento autorizado</dt>
            <dd>10.77.0.0/24</dd>
          </div>
          <div>
            <dt>Dirección del túnel</dt>
            <dd>{view?.address ?? "Sin asignar"}</dd>
          </div>
          <div>
            <dt>Ruta activa</dt>
            <dd>{view?.route ?? "Sin conexión"}</dd>
          </div>
        </dl>
        <button
          className="corporate-vpn-toggle"
          disabled={busy || !view}
          onClick={() => void toggle()}
        >
          {view?.connected ? <Unplug size={16} /> : <ShieldCheck size={16} />}{" "}
          {view?.connected ? "Desconectar VPN" : "Conectar VPN"}
        </button>
      </div>
      {(error || failure) && (
        <div role="alert">
          <p>{failure || error}</p>
          {error && <button onClick={refresh}>Reintentar</button>}
        </div>
      )}
      <p className="corporate-vpn-guidance">
        Conecta este perfil y utiliza la aplicación Terminal para acceder por
        SSH a los servidores. Puedes minimizar o cerrar esta ventana sin
        interrumpir la VPN.
      </p>
      {view?.entry && (
        <details className="corporate-vpn-entry" open>
          <summary>Nota del antiguo administrador</summary>
          <p>
            Destino:{" "}
            <code>
              {view.entry.host} · {view.entry.ip}
            </code>
          </p>
          <blockquote>{view.entry.hint}</blockquote>
          <CopyButton text={view.entry.host} label="Copiar destino" />
        </details>
      )}
      <button className="corporate-vpn-terminal" onClick={onTerminal}>
        <TerminalSquare size={17} /> Abrir Terminal
      </button>
    </section>
  );
}
