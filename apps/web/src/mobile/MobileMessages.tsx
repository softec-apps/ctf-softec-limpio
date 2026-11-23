import { useState } from "react";
import { CheckCheck, Info, Phone, UserRound } from "lucide-react";
type Message = {
  id?: string;
  text?: string;
  deleted?: boolean;
  sender?: string;
  time?: string;
  state?: string;
  device?: string;
  operation?: string;
};
export default function MobileMessages({
  data,
}: {
  data: Record<string, unknown>;
}) {
  const [technical, setTechnical] = useState(false);
  const messages = (data.messages || data.journal || []) as Message[];
  const journal = !!data.journal;
  return (
    <div className="mobile-conversation">
      <header>
        <span className="mobile-contact-avatar">
          <UserRound size={25} />
        </span>
        <div>
          <strong>
            {journal
              ? "Registro de sincronización"
              : String(data.chat || "Archivo de conversaciones")}
          </strong>
          <small>
            {journal ? "Diario preservado" : "Historial del dispositivo"}
          </small>
        </div>
        <button
          aria-label="Mostrar detalles de mensajes"
          aria-pressed={technical}
          onClick={() => setTechnical((v) => !v)}
        >
          <Info size={19} />
        </button>
      </header>
      <p className="mobile-chat-date">12 de febrero de 2026</p>
      {messages.map((m, i) => (
        <div
          key={i}
          className={`mobile-chat-bubble ${m.sender === "analista" ? "outgoing" : ""} ${m.deleted || m.operation === "delete" ? "deleted" : ""}`}
        >
          {journal && (
            <small className="mobile-chat-operation">
              {m.operation === "insert"
                ? "Registro de escritura"
                : "Registro de eliminación"}{" "}
              · {m.id}
            </small>
          )}
          <p>
            {m.deleted
              ? "Este mensaje fue eliminado"
              : m.text || "Registro sin contenido textual"}
          </p>
          <span className="mobile-chat-time">
            {m.state === "draft" ? "Borrador · " : ""}
            {m.time || "Hora no preservada"}
            {m.sender === "analista" && <CheckCheck size={13} />}
          </span>
          {technical && (
            <dl>
              {Object.entries(m)
                .filter(([k]) => k !== "text")
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{String(v)}</dd>
                  </div>
                ))}
            </dl>
          )}
        </div>
      ))}
      <details>
        <summary>Ver exportación original</summary>
        <pre tabIndex={0}>{JSON.stringify(data, null, 2)}</pre>
      </details>
      <div className="mobile-chat-readonly">
        <Phone size={13} /> Historial preservado · Solo lectura
      </div>
    </div>
  );
}
