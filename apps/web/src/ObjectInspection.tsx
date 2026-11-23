import { useEffect, useState } from "react";
import { ArrowLeft, Monitor, FileSearch } from "lucide-react";
import { api, ApiError } from "./api";
import type { SceneObject } from "./sceneCatalog";
export default function ObjectInspection({
  object,
  onComputer,
}: {
  object: SceneObject;
  onComputer: () => void;
}) {
  const [evidence, setEvidence] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [auth, setAuth] = useState(false);
  useEffect(() => {
    let active = true;
    setEvidence(null);
    setError("");
    setAuth(false);
    void api(`/scene/objects/${encodeURIComponent(object.id)}`)
      .then((r) => {
        if (active) setEvidence(r);
      })
      .catch((e) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 401) {
          setAuth(true);
          setError(
            "Inicia sesión en el computador para investigar las pistas de la sala.",
          );
        } else
          setError(
            e instanceof Error ? e.message : "No se pudo examinar el objeto.",
          );
      });
    return () => {
      active = false;
    };
  }, [object.id]);
  return (
    <aside className="world-inspection object-evidence">
      <span>
        <FileSearch size={14} />
        Objeto del escenario
      </span>
      <h1>{object.name}</h1>
      {error ? (
        <p className="object-error" role="alert">
          {error}
        </p>
      ) : evidence ? (
        <>
          <h2>{evidence.title}</h2>
          <pre tabIndex={0}>{evidence.content}</pre>
        </>
      ) : (
        <p>Leyendo evidencia…</p>
      )}
      <button onClick={onComputer}>
        <Monitor size={15} />
        {auth ? "Iniciar sesión en el equipo" : "Ir al computador"}
      </button>
    </aside>
  );
}
