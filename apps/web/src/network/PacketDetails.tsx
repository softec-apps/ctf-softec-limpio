export default function PacketDetails({
  packet,
}: {
  packet: {
    number: number;
    time: string;
    source: string;
    destination: string;
    protocol: string;
    length: number;
    sourcePort?: number;
    destinationPort?: number;
    stream?: number;
    details: Record<string, string>;
    payload?: string;
  };
}) {
  const bytes =
    packet.payload === undefined
      ? undefined
      : new TextEncoder().encode(packet.payload);
  const hex = bytes
    ? Array.from({ length: Math.ceil(bytes.length / 16) }, (_, row) => {
        const slice = bytes.slice(row * 16, row * 16 + 16);
        return `${(row * 16).toString(16).padStart(4, "0")}  ${Array.from(
          slice,
          (b) => b.toString(16).padStart(2, "0"),
        )
          .join(" ")
          .padEnd(
            47,
          )}  ${Array.from(slice, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ".")).join("")}`;
      }).join("\n")
    : "";
  return (
    <div className="packet-protocol-tree" aria-label="Detalles del paquete">
      <details open>
        <summary>
          Trama {packet.number}: {packet.length} bytes · {packet.time}
        </summary>
        <dl>
          <div>
            <dt>Origen</dt>
            <dd>
              {packet.source}
              {packet.sourcePort !== undefined && `:${packet.sourcePort}`}
            </dd>
          </div>
          <div>
            <dt>Destino</dt>
            <dd>
              {packet.destination}
              {packet.destinationPort !== undefined &&
                `:${packet.destinationPort}`}
            </dd>
          </div>
          {packet.stream !== undefined && (
            <div>
              <dt>Flujo</dt>
              <dd>{packet.stream}</dd>
            </div>
          )}
        </dl>
      </details>
      <details open>
        <summary>{packet.protocol} · Campos preservados</summary>
        <dl>
          {Object.entries(packet.details).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </details>
      {bytes ? (
        <details open>
          <summary>
            Bytes de la carga textual preservada · {bytes.length} bytes UTF-8
          </summary>
          <pre aria-label="Carga en hexadecimal" tabIndex={0}>
            {hex}
          </pre>
          <small>
            Representación del texto conservado; no es un volcado de toda la
            trama.
          </small>
        </details>
      ) : (
        <p>No se conserva carga textual decodificada para este paquete.</p>
      )}
      <details>
        <summary>Registro original de la captura</summary>
        <pre tabIndex={0}>{JSON.stringify(packet, null, 2)}</pre>
      </details>
    </div>
  );
}
