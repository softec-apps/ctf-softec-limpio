import MobileDownloads from "./MobileDownloads";
import MobileSystemRecords from "./MobileSystemRecords";
import MobileMessages from "./MobileMessages";
import MobileLocationView from "./MobileLocationView";
import { Image, MessageCircle, ShieldCheck } from "lucide-react";
function valueText(value: unknown): string {
  if (value === null) return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}
function Fields({ value }: { value: Record<string, unknown> }) {
  return (
    <dl>
      {Object.entries(value).map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{valueText(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
export default function MobileArtifactView({
  content,
  app,
}: {
  content: string;
  app: string | null;
}) {
  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(content);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
      throw new Error();
    data = parsed;
  } catch {
    return <pre tabIndex={0}>{content}</pre>;
  }
  if (data.downloads && data.approvedOrigin)
    return (
      <MobileDownloads
        data={
          data as unknown as {
            approvedOrigin: string;
            downloads: {
              name: string;
              origin: string;
              state: string;
              content: string;
            }[];
          }
        }
      />
    );
  if (app === "records") return <MobileSystemRecords data={data} />;
  if (app === "messages") return <MobileMessages data={data} />;
  if (data.zones && data.samples)
    return (
      <MobileLocationView
        data={
          data as unknown as {
            zones: Record<string, number[]>;
            samples: { time: string; position: number[] }[];
          }
        }
      />
    );
  if (app === "files") return <pre tabIndex={0}>{content}</pre>;
  const groups = Object.entries(data);
  return (
    <div className={`mobile-artifact-view artifact-${app}`}>
      {groups.map(([key, value]) =>
        Array.isArray(value) ? (
          <section key={key}>
            <h2>{key}</h2>
            {value.map((record, index) => {
              if (!record || typeof record !== "object")
                return <p key={index}>{valueText(record)}</p>;
              const row = record as Record<string, unknown>;
              return (
                <article key={index}>
                  {app === "messages" ? (
                    <MessageCircle size={18} />
                  ) : app === "gallery" ? (
                    <Image size={22} />
                  ) : (
                    <ShieldCheck size={18} />
                  )}
                  {app === "messages" && ("text" in row || row.deleted) ? (
                    <>
                      <p className="mobile-message-text">
                        {row.deleted ? "Mensaje eliminado" : String(row.text)}
                      </p>
                      <Fields
                        value={Object.fromEntries(
                          Object.entries(row).filter(([key]) => key !== "text"),
                        )}
                      />
                    </>
                  ) : (
                    <Fields value={row} />
                  )}
                </article>
              );
            })}
          </section>
        ) : (
          <section key={key}>
            <h2>{key}</h2>
            {value && typeof value === "object" ? (
              <Fields value={value as Record<string, unknown>} />
            ) : (
              <p>{valueText(value)}</p>
            )}
          </section>
        ),
      )}
      <details>
        <summary>Ver exportación original</summary>
        <pre tabIndex={0}>{content}</pre>
      </details>
    </div>
  );
}
