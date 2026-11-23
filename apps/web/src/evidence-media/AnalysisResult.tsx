import CopyButton from "../web-lab/toolkit/CopyButton";
export default function AnalysisResult({ value }: { value: string }) {
  return value ? (
    <section className="media-result" aria-label="Resultado del análisis">
      <h3>Resultado</h3>
      <textarea
        aria-label="Texto recuperado"
        value={value}
        readOnly
        spellCheck={false}
      />
      <CopyButton text={value} label="Copiar resultado" />
    </section>
  ) : null;
}
