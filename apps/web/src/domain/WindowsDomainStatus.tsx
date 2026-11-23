import { useDomainLab } from "./useDomainLab";
import "./domain.css";
export default function WindowsDomainStatus({ active }: { active: boolean }) {
  const lab = useDomainLab(active);
  return (
    <section className="windows-domain-status" aria-label="Dominio y seguridad">
      <h1>Dominio y seguridad</h1>
      <p>WS01 · Windows 11 · {lab.view?.domain ?? "Consultando dominio…"}</p>
      <button onClick={lab.refresh}>Actualizar estado del equipo</button>
      {lab.error && <p role="alert">{lab.error}</p>}
      {lab.view && (
        <>
          <dl>
            <dt>Controlador</dt>
            <dd>
              {lab.view.controller.name} · {lab.view.controller.ip}
            </dd>
            <dt>Equipo</dt>
            <dd>
              {lab.view.target.name} · {lab.view.target.ip}
            </dd>
            <dt>Directiva de inicio</dt>
            <dd>
              Versión {lab.view.policy.version} · Aplicada{" "}
              {lab.view.policy.applied}
            </dd>
            <dt>Grupo Despliegue</dt>
            <dd>{lab.view.groups.Despliegue.join(", ") || "Sin miembros"}</dd>
            <dt>Delegación de servicios</dt>
            <dd>{lab.view.delegates.join(", ") || "No configurada"}</dd>
          </dl>
          <h2>Eventos de seguridad</h2>
          <div className="domain-event-scroll">
            <table>
              <thead>
                <tr>
                  <th>Secuencia</th>
                  <th>Evento</th>
                  <th>Identidad</th>
                  <th>Actividad</th>
                </tr>
              </thead>
              <tbody>
                {lab.view.events
                  .slice()
                  .reverse()
                  .map((event) => (
                    <tr key={event.sequence}>
                      <td>{event.sequence}</td>
                      <td>{event.id}</td>
                      <td>{event.actor}</td>
                      <td>
                        {event.action} · {event.target}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!lab.view.events.length && (
            <p>Sin actividad de dominio registrada.</p>
          )}
          <p>
            Las operaciones de investigación se realizan desde el PC Linux. Esta
            vista muestra sus efectos en el equipo.
          </p>
        </>
      )}
    </section>
  );
}
