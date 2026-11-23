import { AppWindow, Bell, HardDrive, Monitor, Smartphone } from "lucide-react";
type Row = Record<string, unknown>;
const str = (value: unknown) =>
  value === undefined || value === null
    ? "—"
    : Array.isArray(value)
      ? value.join(", ")
      : String(value);
function Fields({ row }: { row: Row }) {
  const labels: Record<string, string> = {
    id: "Identificador",
    account: "Cuenta",
    device: "Dispositivo",
    state: "Estado",
    permission: "Permiso",
    created: "Capturado (UTC)",
    restored: "Restaurado (UTC)",
    records: "Registros incluidos",
    emitted: "Emitido",
    received: "Recibido",
    time: "Hora UTC",
    action: "Acción",
    session: "Sesión",
    kind: "Tipo",
  };
  return (
    <dl>
      {Object.entries(row).map(([k, v]) => (
        <div key={k}>
          <dt>{labels[k] || k}</dt>
          <dd>{str(v)}</dd>
        </div>
      ))}
    </dl>
  );
}
export default function MobileSystemRecords({
  data,
}: {
  data: Record<string, unknown>;
}) {
  const grants = data.grants as Row[] | undefined;
  const approved = data.approved as Record<string, string[]> | undefined;
  const groups = [
    ["notifications", "Historial de notificaciones"],
    ["snapshots", "Copias del dispositivo"],
    ["sessions", "Dispositivos y sesiones"],
    ["events", "Actividad registrada"],
  ] as const;
  return (
    <div className="mobile-system-records">
      {grants && (
        <>
          <h2>Permisos de aplicaciones</h2>
          <p>Estado de la adquisición</p>
          {[...new Set(grants.map((g) => String(g.package)))].map((name) => (
            <details key={name}>
              <summary>
                <AppWindow size={22} />
                <span>
                  {name}
                  <small>
                    {
                      grants.filter(
                        (g) => g.package === name && g.state === "granted",
                      ).length
                    }{" "}
                    permisos concedidos
                  </small>
                </span>
              </summary>
              <p className="mobile-permission-policy">
                Política aprobada:{" "}
                {approved?.[name]?.join(", ") || "No preservada"}
              </p>
              {grants
                .filter((g) => g.package === name)
                .map((g, i) => (
                  <div className="mobile-permission-line" key={i}>
                    <span>{str(g.permission)}</span>
                    <strong>
                      {g.state === "granted" ? "Permitido" : "Revocado"}
                    </strong>
                  </div>
                ))}
            </details>
          ))}
        </>
      )}
      {groups.map(
        ([key, title]) =>
          Array.isArray(data[key]) && (
            <section key={key}>
              <h2>{title}</h2>
              {(data[key] as Row[]).map((row, i) => (
                <article key={i}>
                  <div className="mobile-system-record-title">
                    {key === "notifications" ? (
                      <Bell size={20} />
                    ) : key === "snapshots" ? (
                      <HardDrive size={22} />
                    ) : key === "sessions" ? (
                      <Monitor size={22} />
                    ) : (
                      <Smartphone size={22} />
                    )}
                    <strong>{str(row.device || row.id || row.action)}</strong>
                    {Boolean(row.state) && <small>{str(row.state)}</small>}
                  </div>
                  <Fields row={row} />
                </article>
              ))}
            </section>
          ),
      )}
      <details>
        <summary>Ver exportación original</summary>
        <pre tabIndex={0}>{JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  );
}
