import { useState, type FormEvent } from "react";
import type { WirelessAssessment as Assessment } from "../../../../packages/wireless-contracts";

export default function WirelessAssessment({
  assessment,
  busy,
  onSubmit,
}: {
  assessment: Assessment;
  busy: boolean;
  onSubmit: (command: string) => Promise<void>;
}) {
  const [cause, setCause] = useState("");
  const [prediction, setPrediction] = useState("");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const disabled = busy || assessment.accepted;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!disabled && cause && prediction && first && second && first !== second)
      void onSubmit(`assess ${cause} ${prediction} ${first},${second}`);
  }
  return (
    <section
      className="wireless-assessment"
      aria-label="Diagnóstico y predicción"
    >
      <h4>
        {assessment.stage === "diagnosis"
          ? "Fase 1 · Diagnóstico"
          : "Fase 2 · Adaptar la solución"}
      </h4>
      <p className="wireless-assessment-brief">{assessment.brief}</p>
      {assessment.accepted && assessment.response ? (
        <div>
          <p>
            <strong>Tu diagnóstico:</strong> {assessment.response.cause}
          </p>
          <p>
            <strong>Tu predicción:</strong> {assessment.response.prediction}
          </p>
          <ul>
            {assessment.response.evidence.map((packet) => (
              <li key={packet.number}>
                #{packet.number}: {packet.info}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <form onSubmit={submit}>
          <label>
            Diagnóstico
            <select
              required
              value={cause}
              disabled={disabled}
              onChange={(event) => setCause(event.target.value)}
            >
              <option value="">
                Selecciona la causa compatible con las trazas
              </option>
              {assessment.causes.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Predicción del resultado
            <span>{assessment.question}</span>
            <select
              required
              value={prediction}
              disabled={disabled}
              onChange={(event) => setPrediction(event.target.value)}
            >
              <option value="">Selecciona el efecto que esperas</option>
              {assessment.predictions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {[
            {
              label: "Evidencia 1",
              value: first,
              set: setFirst,
              other: second,
            },
            {
              label: "Evidencia 2",
              value: second,
              set: setSecond,
              other: first,
            },
          ].map((field) => (
            <label key={field.label}>
              {field.label}
              <select
                required
                value={field.value}
                disabled={disabled}
                onChange={(event) => field.set(event.target.value)}
              >
                <option value="">Elige una observación de la captura</option>
                {assessment.evidence.map((packet) => (
                  <option
                    key={packet.number}
                    value={packet.number}
                    disabled={String(packet.number) === field.other}
                  >
                    {packet.summary}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button
            disabled={
              disabled ||
              !cause ||
              !prediction ||
              !first ||
              !second ||
              first === second
            }
          >
            {assessment.accepted
              ? "Diagnóstico registrado"
              : "Registrar diagnóstico y predicción"}
          </button>
        </form>
      )}
      {assessment.feedback && (
        <p role={assessment.accepted ? "status" : "alert"}>
          {assessment.feedback}
        </p>
      )}
    </section>
  );
}
