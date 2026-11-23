import type { WindowsFile } from "./types";
export default function WindowsProperties({ file }: { file?: WindowsFile }) {
  return (
    <div className="win-file-properties">
      <h2>Propiedades</h2>
      {file ? (
        <dl>
          {Object.entries({
            Nombre: file.name,
            Ruta: file.path,
            Formato:
              file.format === "events" ? "Exportación de eventos" : "Texto",
            Tamaño: `${file.properties.bytes} bytes`,
            Creado: file.properties.created,
            Modificado: file.properties.modified,
            Atributos: file.properties.attributes.join(", "),
          }).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>Selecciona un archivo en el explorador y abre sus propiedades.</p>
      )}
    </div>
  );
}
