import { ChevronLeft, ChevronRight } from "lucide-react";
import "./pagination.css";

export default function ChallengePagination({
  page,
  pages,
  onPage,
  label = "Paginación de retos",
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
  label?: string;
}) {
  return (
    <nav className="challenge-pages" aria-label={label}>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft size={18} aria-hidden="true" />
        <span>Anterior</span>
      </button>
      <label>
        Página
        <select
          aria-label="Elegir página"
          value={page}
          onChange={(event) => onPage(Number(event.target.value))}
        >
          {Array.from({ length: pages }, (_, index) => index + 1).map(
            (number) => (
              <option value={number} key={number}>
                {number} de {pages}
              </option>
            ),
          )}
        </select>
      </label>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        aria-label="Página siguiente"
      >
        <span>Siguiente</span>
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  );
}
