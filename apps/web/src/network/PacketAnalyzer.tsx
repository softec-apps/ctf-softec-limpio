import PacketDetails from "./PacketDetails";
import { useEffect, useState } from "react";
import { api } from "../api";
import CopyButton from "../web-lab/toolkit/CopyButton";
import "./network.css";

type Packet = {
  number: number;
  time: string;
  source: string;
  destination: string;
  protocol: string;
  length: number;
  info: string;
  sourcePort?: number;
  destinationPort?: number;
  stream?: number;
  details: Record<string, string>;
  payload?: string;
};
export default function PacketAnalyzer() {
  const [refresh, setRefresh] = useState(0);
  const [captures, setCaptures] = useState<{ name: string; path: string }[]>(
    [],
  );
  const [path, setPath] = useState("");
  const [packets, setPackets] = useState<Packet[]>([]);
  const [protocol, setProtocol] = useState("");
  const [address, setAddress] = useState("");
  const [port, setPort] = useState("");
  const [query, setQuery] = useState("");
  const [stream, setStream] = useState("");
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");
  const [selected, setSelected] = useState<number>();
  const [following, setFollowing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void api<{ entries: { name: string; path: string }[] }>(
      "/network/captures",
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) setCaptures(result.entries);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "No se pudieron listar las capturas.",
          );
      });
    return () => controller.abort();
  }, [refresh]);
  useEffect(() => {
    if (!path) {
      setPackets([]);
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    setError("");
    setPackets([]);
    setSelected(undefined);
    setFollowing(false);
    const captureRequest =
      path.startsWith("/network/labs/") || path.startsWith("/wireless/labs/")
        ? api<{ format: string; packets: Packet[] }>(path, {
            signal: controller.signal,
          })
        : api<{ type: string; content: string }>(
            `/workstation/files?path=${encodeURIComponent(path)}`,
            { signal: controller.signal },
          ).then((file) => {
            if (file.type !== "file") throw Error("La ruta no es un archivo.");
            return JSON.parse(file.content) as {
              format: string;
              packets: Packet[];
            };
          });
    void captureRequest
      .then((capture) => {
        if (controller.signal.aborted) return;
        if (
          capture.format !== "seventech-capture-v1" ||
          !Array.isArray(capture.packets)
        )
          throw Error("Formato de captura no compatible.");
        setPackets(capture.packets);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "No se pudo abrir la captura.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [path, refresh]);
  function clearFilters() {
    setProtocol("");
    setAddress("");
    setPort("");
    setQuery("");
    setStream("");
    setAfter("");
    setBefore("");
    setFollowing(false);
  }
  const filtered = packets.filter(
    (packet) =>
      (!protocol || packet.protocol === protocol) &&
      (!address ||
        packet.source === address.trim() ||
        packet.destination === address.trim()) &&
      (!port ||
        packet.sourcePort === Number(port) ||
        packet.destinationPort === Number(port)) &&
      (!stream || packet.stream === Number(stream)) &&
      (!query ||
        JSON.stringify(packet).toLowerCase().includes(query.toLowerCase())) &&
      (!after || packet.time.slice(0, 16) >= after) &&
      (!before || packet.time.slice(0, 16) <= before),
  );
  const detail = filtered.find((packet) => packet.number === selected);
  const transcript = filtered
    .filter((packet) => packet.payload !== undefined)
    .map(
      (packet) =>
        `${packet.time} · ${packet.source}:${packet.sourcePort ?? "—"} → ${packet.destination}:${packet.destinationPort ?? "—"}\n${packet.payload}`,
    )
    .join("\n\n");
  return (
    <section className="packet-analyzer" aria-label="Analizador de paquetes">
      <header>
        <h2>Analizador de paquetes</h2>
        <p>
          Capturas preservadas y sesiones operativas · tiempo según la fuente
        </p>
        <button onClick={() => setRefresh((n) => n + 1)} disabled={busy}>
          Actualizar capturas
        </button>
      </header>
      <label>
        Archivo de captura
        <select
          aria-label="Archivo de captura"
          value={path}
          onChange={(event) => {
            setPath(event.target.value);
            clearFilters();
          }}
        >
          <option value="">Abrir una captura preservada</option>
          {captures.map((entry) => (
            <option key={entry.path} value={entry.path}>
              {entry.name} · {entry.path}
            </option>
          ))}
        </select>
      </label>
      <div className="packet-filters">
        <label>
          Protocolo
          <select
            aria-label="Protocolo"
            value={protocol}
            onChange={(event) => setProtocol(event.target.value)}
          >
            <option value="">Todos</option>
            {[...new Set(packets.map((packet) => packet.protocol))]
              .sort()
              .map((value) => (
                <option key={value}>{value}</option>
              ))}
          </select>
        </label>
        <label>
          Dirección IP
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Origen o destino"
          />
        </label>
        <label>
          Puerto
          <input
            value={port}
            onChange={(event) => setPort(event.target.value)}
            inputMode="numeric"
          />
        </label>
        <label>
          Flujo
          <input
            value={stream}
            onChange={(event) => {
              setStream(event.target.value);
              setFollowing(false);
            }}
            inputMode="numeric"
          />
        </label>
        <label>
          Buscar en paquetes
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={200}
          />
        </label>
        <label>
          Desde UTC
          <input
            type="datetime-local"
            value={after}
            onChange={(event) => setAfter(event.target.value)}
          />
        </label>
        <label>
          Hasta UTC
          <input
            type="datetime-local"
            value={before}
            onChange={(event) => setBefore(event.target.value)}
          />
        </label>
      </div>
      <div className="packet-actions">
        <button onClick={clearFilters}>Limpiar filtros</button>
        <span role="status">
          {busy
            ? "Leyendo captura…"
            : `${filtered.length} de ${packets.length} paquetes`}
        </span>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="packet-table">
        <table>
          <thead>
            <tr>
              <th>N.º</th>
              <th>Hora UTC</th>
              <th>Origen</th>
              <th>Destino</th>
              <th>Protocolo</th>
              <th>Información</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((packet) => (
              <tr
                key={packet.number}
                aria-selected={packet.number === selected}
                onClick={() => {
                  setSelected(packet.number);
                  setFollowing(false);
                }}
              >
                <td>
                  <button
                    aria-label={`Examinar paquete ${packet.number}`}
                    onClick={() => {
                      setSelected(packet.number);
                      setFollowing(false);
                    }}
                  >
                    {packet.number}
                  </button>
                </td>
                <td>{packet.time.slice(11, -1)}</td>
                <td>{packet.source}</td>
                <td>{packet.destination}</td>
                <td>{packet.protocol}</td>
                <td>{packet.info}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detail && (
        <div className="packet-detail">
          <div className="packet-actions">
            <h3>Paquete {detail.number}</h3>
            <CopyButton
              text={JSON.stringify(detail, null, 2)}
              label="Copiar paquete"
            />
            <button
              disabled={detail.stream === undefined}
              onClick={() => {
                clearFilters();
                setStream(String(detail.stream));
                setFollowing(true);
              }}
            >
              Seguir flujo
            </button>
          </div>
          <PacketDetails packet={detail} />
        </div>
      )}
      {following && (
        <div className="packet-transcript">
          <h3>Flujo {stream}</h3>
          <textarea
            aria-label="Contenido textual del flujo"
            readOnly
            value={
              transcript || "No hay carga textual preservada en este flujo."
            }
            rows={8}
          />
          <CopyButton text={transcript} label="Copiar flujo" />
        </div>
      )}
      {!path && (
        <p>
          Abre un archivo del entorno simulado. Esta aplicación no captura
          tráfico del equipo anfitrión.
        </p>
      )}
    </section>
  );
}
