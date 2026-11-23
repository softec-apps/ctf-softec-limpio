import { lazy, Suspense } from "react";
const ServiceConsole = lazy(() => import("../service-console/ServiceConsole"));
const MemoryAnalyzer = lazy(() => import("../memory/MemoryAnalyzer"));
const DomainExplorer = lazy(() => import("../domain/DomainExplorer"));
const CredentialAnalyzer = lazy(() => import("../domain/CredentialAnalyzer"));
const Disassembler = lazy(() => import("../reversing/Disassembler"));
const ImageInspector = lazy(() => import("../evidence-media/ImageInspector"));
const AudioInspector = lazy(() => import("../evidence-media/AudioInspector"));
const HexEditor = lazy(() => import("../evidence-media/HexEditor"));
const EnigmaMachine = lazy(() => import("../enigma/EnigmaMachine"));
import PacketAnalyzer from "../network/PacketAnalyzer";
import HttpInspector from "../web-lab/toolkit/HttpInspector";
import TextWorkbench from "../web-lab/toolkit/TextWorkbench";
import EvidenceBrowser from "../web-lab/toolkit/EvidenceBrowser";
import ComparisonPanel from "../web-lab/toolkit/ComparisonPanel";
import JsonEditor from "../web-lab/toolkit/JsonEditor";
import type {
  ComparisonDocument,
  ComparisonDraft,
  ComparisonSide,
} from "../web-lab/toolkit/lineComparison";
import type { ToolAppId } from "./applications";
import "../web-lab/toolkit/toolkit.css";
export default function ToolApplication({
  id,
  challengeId,
  fileRequest,
  comparison,
  onCompare,
  onChangeComparison,
}: {
  id: ToolAppId;
  challengeId?: string;
  fileRequest?: { path: string; sequence: number };
  comparison: ComparisonDraft;
  onCompare: (side: ComparisonSide, document: ComparisonDocument) => void;
  onChangeComparison: (side: ComparisonSide, text: string) => void;
}) {
  if (id === "enigma")
    return (
      <div className="tool-application">
        <Suspense fallback={<p className="window-loading">Abriendo Enigma…</p>}>
          <EnigmaMachine />
        </Suspense>
      </div>
    );
  if (id === "sql" || id === "contracts")
    return (
      <div className="tool-application">
        <Suspense fallback={<p>Abriendo consola…</p>}>
          <ServiceConsole kind={id} challengeId={challengeId} />
        </Suspense>
      </div>
    );
  if (id === "memory")
    return (
      <div className="tool-application">
        <Suspense fallback={<p>Abriendo analizador…</p>}>
          <MemoryAnalyzer request={fileRequest} />
        </Suspense>
      </div>
    );
  if (id === "domain" || id === "credentials")
    return (
      <div className="tool-application">
        <Suspense
          fallback={<p className="window-loading">Abriendo herramienta…</p>}
        >
          {id === "domain" ? <DomainExplorer /> : <CredentialAnalyzer />}
        </Suspense>
      </div>
    );
  if (id === "reverse" || id === "image" || id === "audio" || id === "hex")
    return (
      <div className="tool-application">
        <Suspense
          fallback={<p className="window-loading">Abriendo aplicación…</p>}
        >
          {id === "reverse" ? (
            <Disassembler request={fileRequest} />
          ) : id === "image" ? (
            <ImageInspector request={fileRequest} />
          ) : id === "audio" ? (
            <AudioInspector request={fileRequest} />
          ) : (
            <HexEditor request={fileRequest} />
          )}
        </Suspense>
      </div>
    );
  return (
    <div className="tool-application">
      {id === "evidence" ? (
        <EvidenceBrowser onCompare={onCompare} />
      ) : (
        <div className="kit-content">
          {id === "packets" ? (
            <PacketAnalyzer />
          ) : id === "http" ? (
            <HttpInspector onCompare={onCompare} />
          ) : id === "transform" ? (
            <TextWorkbench />
          ) : id === "compare" ? (
            <ComparisonPanel draft={comparison} onChange={onChangeComparison} />
          ) : (
            <JsonEditor />
          )}
        </div>
      )}
    </div>
  );
}
