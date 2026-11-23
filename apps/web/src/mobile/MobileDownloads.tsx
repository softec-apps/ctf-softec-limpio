import { FileText, CheckCircle2, PauseCircle } from "lucide-react";
type Download = {
  name: string;
  origin: string;
  state: string;
  content: string;
};
export default function MobileDownloads({
  data,
}: {
  data: { approvedOrigin: string; downloads: Download[] };
}) {
  return (
    <div className="mobile-download-manager">
      <h2>Descargas</h2>
      <p>Historial del navegador</p>
      {data.downloads.map((d, i) => (
        <article key={i}>
          <FileText size={29} />
          <div>
            <strong>{d.name}</strong>
            <small>{d.origin}</small>
            <span
              className={
                d.state === "complete"
                  ? "download-complete"
                  : "download-stopped"
              }
            >
              {d.state === "complete" ? (
                <CheckCircle2 size={13} />
              ) : (
                <PauseCircle size={13} />
              )}{" "}
              {d.state === "complete" ? "Completada" : "Interrumpida"}
            </span>
            <details>
              <summary>Detalles del archivo</summary>
              <dl>
                <dt>Identificador de contenido</dt>
                <dd>{d.content}</dd>
              </dl>
            </details>
          </div>
        </article>
      ))}
      <details>
        <summary>Datos de adquisición</summary>
        <p>Origen aprobado: {data.approvedOrigin}</p>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  );
}
