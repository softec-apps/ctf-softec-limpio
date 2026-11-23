import FlagInput from "./FlagInput";
import { completeFlag } from "./flag-format";
import { useEffect, useId, useRef, useState } from "react";
import { Check, Send } from "lucide-react";
import { api, post, type Game } from "../api";
import "./challenge-submission.css";

export default function ChallengeSubmission({
  challengeId,
  title,
  disabled = false,
  onBusy,
  noun = "relato",
}: {
  challengeId: string;
  title: string;
  disabled?: boolean;
  onBusy?: (busy: boolean) => void;
  noun?: "relato" | "expediente";
}) {
  const field = useId();
  const active = useRef(true);
  const [flag, setFlag] = useState("");
  const [completion, setCompletion] = useState<{
    solved: boolean;
    points: number;
  }>();
  const [progressError, setProgressError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);
  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    setProgressError("");
    void api<Game>("/game", { signal: controller.signal })
      .then((game) => {
        if (controller.signal.aborted) return;
        const solve = game.solves.find(
          (entry) => entry.challengeId === challengeId,
        );
        const reward =
          game.challenges.find((entry) => entry.id === challengeId)?.points ??
          0;
        setCompletion({ solved: !!solve, points: solve?.points ?? reward });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setCompletion(undefined);
        setProgressError(
          error instanceof Error
            ? error.message
            : "No se pudo consultar el progreso.",
        );
      });
    return () => {
      active.current = false;
      controller.abort();
    };
  }, [challengeId, attempt]);
  useEffect(() => {
    const refresh = () => setAttempt((value) => value + 1);
    const visible = () => {
      if (!document.hidden) refresh();
    };
    window.addEventListener("ctf-progress-changed", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("ctf-progress-changed", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || disabled || !completion || completion.solved || !flag.trim())
      return;
    setBusy(true);
    onBusy?.(true);
    setFeedback(null);
    try {
      const result = await post(
        `/challenges/${encodeURIComponent(challengeId)}/submissions`,
        { flag: completeFlag(flag) },
      );
      if (active.current) {
        if (result.correct) {
          setCompletion({
            solved: true,
            points: result.awardedPoints || completion.points,
          });
          setFlag("");
          setFeedback(null);
        } else setFeedback({ correct: false, message: result.message });
      }
      if (result.correct)
        window.dispatchEvent(new Event("ctf-progress-changed"));
    } catch (error) {
      if (active.current)
        setFeedback({
          correct: false,
          message:
            error instanceof Error
              ? error.message
              : "No se pudo enviar la flag. Vuelve a intentarlo.",
        });
    } finally {
      if (active.current) {
        setBusy(false);
        onBusy?.(false);
      }
    }
  }
  if (progressError)
    return (
      <div className="storybook-submission">
        <p className="storybook-submission-feedback is-error" role="alert">
          {progressError}
        </p>
        <button onClick={() => setAttempt((value) => value + 1)}>
          Reintentar
        </button>
      </div>
    );
  if (!completion)
    return (
      <div className="storybook-submission" role="status">
        Consultando el estado del {noun}…
      </div>
    );
  if (completion.solved)
    return (
      <div className="storybook-submission storybook-solved" role="status">
        <Check size={20} aria-hidden="true" />
        <div>
          <strong>Este {noun} ya está resuelto.</strong>
          <span>
            {completion.points}{" "}
            {completion.points === 1 ? "punto obtenido" : "puntos obtenidos"}
          </span>
        </div>
      </div>
    );
  return (
    <form
      className="storybook-submission"
      onSubmit={submit}
      aria-label={`Enviar flag de ${title}`}
    >
      <div className="storybook-submission-fields">
        <label htmlFor={field}>
          Flag de este {noun}
          <FlagInput
            id={field}
            value={flag}
            onChange={setFlag}
            disabled={busy || disabled}
          />
        </label>
        <button type="submit" disabled={busy || disabled || !flag.trim()}>
          <Send size={16} aria-hidden="true" />
          {busy ? "Enviando…" : "Enviar flag"}
        </button>
      </div>
      {feedback && (
        <p
          className={`storybook-submission-feedback ${feedback.correct ? "is-correct" : "is-error"}`}
          role={feedback.correct ? "status" : "alert"}
        >
          {feedback.message}
        </p>
      )}
    </form>
  );
}
