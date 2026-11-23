import { useEffect, useRef, useState } from "react";
import { createAuditorium, type AuditoriumView } from "./createAuditorium";
import type { AuditoriumDisplay } from "./paintAuditorium";

export default function AuditoriumWorld({
  display,
  view,
}: {
  display: AuditoriumDisplay;
  view: AuditoriumView;
}) {
  const container = useRef<HTMLDivElement>(null);
  const world = useRef<ReturnType<typeof createAuditorium> | null>(null);
  const [failure, setFailure] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let instance: ReturnType<typeof createAuditorium>;
    try {
      instance = createAuditorium(element);
      world.current = instance;
    } catch {
      setFailure(true);
      return;
    }
    const lost = (event: Event) => {
      event.preventDefault();
      setFailure(true);
      instance.dispose();
      world.current = null;
    };
    element.addEventListener("webglcontextlost", lost, true);
    return () => {
      element.removeEventListener("webglcontextlost", lost, true);
      instance.dispose();
      world.current = null;
    };
  }, [attempt]);
  useEffect(() => {
    world.current?.update(display);
  }, [display, attempt]);
  useEffect(() => {
    world.current?.setView(view);
  }, [view, attempt]);
  return (
    <>
      <div ref={container} className="auditorium-world" />
      {failure && (
        <div className="auditorium-fallback" role="alert">
          <h2>No se pudo mostrar la sala 3D</h2>
          <p>
            Puedes consultar el marcador con «Resultados en texto» o intentar
            abrir la sala de nuevo.
          </p>
          <button
            onClick={() => {
              setFailure(false);
              setAttempt((value) => value + 1);
            }}
          >
            Volver a abrir la sala
          </button>
        </div>
      )}
    </>
  );
}
