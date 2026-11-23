import { LockKeyhole } from "lucide-react";
import type { CompetitionStatus } from "../api";
import "./competition.css";

export default function CompetitionNotice({
  competition,
}: {
  competition?: CompetitionStatus;
}) {
  if (!competition || competition.open) return null;
  return (
    <div className="competition-notice" role="status">
      <LockKeyhole size={18} aria-hidden="true" />
      <p>
        <strong>Competencia cerrada.</strong> Los puntos obtenidos se conservan.
        Puedes seguir explorando el laboratorio; no se aceptan nuevas entregas.
      </p>
    </div>
  );
}
