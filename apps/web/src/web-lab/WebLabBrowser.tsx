import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, FileText, Globe, Home } from "lucide-react";
import { api } from "../api";
import { BROWSER_LABS, type BrowserLabId } from "./catalog";
import "./web-lab.css";
import LabActionForm, { type LabForm } from "./LabActionForm";

type LabPage = {
  media?: { src: string; alt: string; caption: string };
  source?: { publisher: string; date: string };
  status: number;
  url: string;
  kind: "index" | "document" | "error";
  title: string;
  body: string;
  query?: string;
  form?: LabForm;
  links?: { label: string; path: string }[];
  results?: { id: string; title: string; body: string }[];
  documents?: { id: string; title: string }[];
};

export default function WebLabBrowser({
  challengeId,
}: {
  challengeId: BrowserLabId;
}) {
  const lab = BROWSER_LABS[challengeId];
  const [history, setHistory] = useState<string[]>([lab.home]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [address, setAddress] = useState<string>(lab.home);
  const [navigation, setNavigation] = useState<{
    url: string;
    sequence: number;
  }>({
    url: lab.home,
    sequence: 0,
  });
  const [page, setPage] = useState<LabPage | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setPage(null);
    setError("");
    void api<LabPage>(`/challenges/${challengeId}/web`, {
      method: "POST",
      body: JSON.stringify({ url: navigation.url }),
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted) return;
        setPage(response);
        setAddress(response.url);
        if (response.query !== undefined) setQuery(response.query);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "No se pudo consultar el archivo.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [navigation, challengeId]);

  function visit(url: string) {
    setHistory((previous) => [...previous.slice(0, historyIndex + 1), url]);
    setHistoryIndex(historyIndex + 1);
    setAddress(url);
    setNavigation((current) => ({ url, sequence: current.sequence + 1 }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    visit(address);
  }

  return (
    <div className="intranet web-lab-browser" data-site={challengeId}>
      <div className="browser-chrome">
        <div className="browser-tab">
          <Globe size={14} /> {lab.title}
        </div>
        <form className="browser-address web-lab-address" onSubmit={submit}>
          <button
            type="button"
            aria-label="Página anterior"
            disabled={historyIndex === 0 || busy}
            onClick={() => {
              const next = historyIndex - 1;
              setHistoryIndex(next);
              setNavigation((n) => ({
                url: history[next],
                sequence: n.sequence + 1,
              }));
            }}
          >
            <ArrowLeft size={17} />
          </button>
          <button
            type="button"
            aria-label="Página siguiente"
            disabled={historyIndex === history.length - 1 || busy}
            onClick={() => {
              const next = historyIndex + 1;
              setHistoryIndex(next);
              setNavigation((n) => ({
                url: history[next],
                sequence: n.sequence + 1,
              }));
            }}
          >
            <ArrowRight size={17} />
          </button>
          <button
            type="button"
            aria-label={`Inicio de ${lab.title}`}
            onClick={() => visit(lab.home)}
          >
            <Home size={16} />
          </button>
          <input
            aria-label={lab.addressLabel}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            maxLength={512}
            spellCheck={false}
            autoComplete="off"
          />
          <button type="submit" aria-label="Ir a la dirección" disabled={busy}>
            <ArrowRight size={17} />
          </button>
        </form>
      </div>
      <div className="intranet-body web-lab-body" aria-busy={busy}>
        <header>
          <strong>
            SEVENTECH<span> / {lab.section}</span>
          </strong>
          <span>{lab.identity}</span>
        </header>
        {busy && <p role="status">Consultando servicio…</p>}
        {error && (
          <p className="web-lab-error" role="alert">
            {error}
          </p>
        )}
        {page && (
          <article>
            <span className="intranet-kicker">
              {page.kind === "index"
                ? "Área de trabajo"
                : `${lab.title} · HTTP ${page.status}`}
            </span>
            <div className="preserved-site-masthead">
              <span>{page.source?.publisher || lab.title}</span>
              <small>
                {page.source
                  ? `Publicación del ${page.source.date}`
                  : new URL(lab.home).hostname}
              </small>
            </div>
            <h1>{page.title}</h1>
            {lab.search && (
              <form
                className="web-lab-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  const url = new URL(lab.home);
                  url.searchParams.set("q", query);
                  visit(url.href);
                }}
              >
                <label>
                  Buscar boletines
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    maxLength={160}
                    autoComplete="off"
                    placeholder="Título o término de búsqueda"
                  />
                </label>
                <button disabled={busy}>Buscar</button>
              </form>
            )}
            {page.media && (
              <figure className="preserved-source-photo">
                <img src={page.media.src} alt={page.media.alt} loading="lazy" />
                <figcaption>{page.media.caption}</figcaption>
              </figure>
            )}
            <p className="web-lab-document">{page.body}</p>
            {page.form && (
              <LabActionForm
                key={challengeId + page.url}
                form={page.form}
                onVisit={visit}
              />
            )}
            {page.links && (
              <nav className="web-lab-links" aria-label="Enlaces del servicio">
                {page.links.map((link) => (
                  <button key={link.path} onClick={() => visit(link.path)}>
                    {link.label}
                    <ArrowRight size={15} />
                  </button>
                ))}
              </nav>
            )}
            {page.results && (
              <div
                className="web-lab-results"
                aria-label="Resultados de búsqueda"
              >
                {page.results.map((result) => (
                  <article key={result.id}>
                    <small>{result.id}</small>
                    <h2>{result.title}</h2>
                    <p className="web-lab-document">{result.body}</p>
                  </article>
                ))}
              </div>
            )}
            {page.documents && (
              <div
                className="web-lab-records"
                aria-label="Documentos de Operaciones"
              >
                {page.documents.map((document) => (
                  <button
                    key={document.id}
                    onClick={() =>
                      visit(`${lab.home}${lab.recordBase}${document.id}`)
                    }
                  >
                    <FileText size={20} />
                    <span>
                      <strong>{document.title}</strong>
                      <small>ST-{document.id} · Operaciones</small>
                    </span>
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
            )}
          </article>
        )}
        <footer>Seventech · {lab.title}</footer>
      </div>
    </div>
  );
}
