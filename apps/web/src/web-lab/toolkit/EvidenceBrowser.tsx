import { useRef, useState } from "react";
import { FileText } from "lucide-react";
import EvidenceDesk from "./EvidenceDesk";
import VirtualFilePicker from "./VirtualFilePicker";
import type { ComparisonDocument, ComparisonSide } from "./lineComparison";

type Document = { id: number; name: string; text: string };

export default function EvidenceBrowser({
  onCompare,
}: {
  onCompare: (side: ComparisonSide, document: ComparisonDocument) => void;
}) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selected, setSelected] = useState<number>();
  const [browsing, setBrowsing] = useState(true);
  const nextId = useRef(0);
  const document = documents.find((entry) => entry.id === selected);

  function addDocument(name: string, text: string) {
    const id = nextId.current++;
    setDocuments((current) => [...current, { id, name, text }]);
    setSelected(id);
  }

  return (
    <div className="evidence-browser">
      <aside aria-label="Documentos abiertos">
        <strong>Documentos abiertos</strong>
        <button onClick={() => setBrowsing(true)}>
          Abrir archivo virtual…
        </button>
        <button
          onClick={() => {
            addDocument("Sin título", "");
            setBrowsing(false);
          }}
        >
          Pegar texto nuevo
        </button>
        {documents.map((entry) => (
          <button
            key={entry.id}
            aria-pressed={selected === entry.id}
            onClick={() => {
              setSelected(entry.id);
              setBrowsing(false);
            }}
          >
            <FileText size={17} />
            <span>{entry.name}</span>
          </button>
        ))}
      </aside>
      <div className="kit-content">
        {browsing ? (
          <VirtualFilePicker
            onOpen={(path, content) => {
              addDocument(path, content);
              setBrowsing(false);
            }}
          />
        ) : document ? (
          <EvidenceDesk
            key={document.id}
            name={document.name}
            content={document.text}
            onChange={(name, text) =>
              setDocuments((current) =>
                current.map((entry) =>
                  entry.id === document.id ? { ...entry, name, text } : entry,
                ),
              )
            }
            onClose={() => {
              setDocuments((current) =>
                current.filter((entry) => entry.id !== document.id),
              );
              setSelected(
                documents.find((entry) => entry.id !== document.id)?.id,
              );
            }}
            onCompare={onCompare}
          />
        ) : (
          <section className="kit-module">
            <h2>Visor de evidencias</h2>
            <p>
              Abre archivos del entorno simulado o pega contenido para
              revisarlo. Los documentos permanecen en esta ventana hasta que la
              cierres o recargues la página.
            </p>
            <p>Usa Abrir archivo virtual para explorar /home/analista.</p>
          </section>
        )}
      </div>
    </div>
  );
}
