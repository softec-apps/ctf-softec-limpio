import { Globe } from "lucide-react";
import { useState } from "react";
import "./browser-home.css";
import {
  BROWSER_LABS,
  hasBrowserLab,
  type BrowserLabId,
} from "../web-lab/catalog";
export default function BrowserHome({
  serviceIds,
  onVisit,
  onMaintenance,
  onPrinter,
  onOt,
}: {
  serviceIds: string[];
  onVisit: (id: BrowserLabId) => void;
  onPrinter: () => void;
  onOt: () => void;
  onMaintenance: (url: string) => void;
}) {
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="browser-home">
      <Globe size={36} />
      <h1>Intranet Seventech</h1>
      <p>Servicios disponibles en esta estación.</p>
      <form
        className="browser-home-address"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          try {
            const url = new URL(address);
            if (
              url.origin === "http://gestion.seventech.local" &&
              !url.username &&
              !url.password
            ) {
              onMaintenance(url.href);
              return;
            }
            if (
              ["http://printer.seventech.local", "http://10.77.0.60"].includes(
                url.origin,
              ) &&
              !url.username &&
              !url.password &&
              serviceIds.some((id) => id.startsWith("iot-"))
            ) {
              onPrinter();
              return;
            }
            if (
              ["http://control.seventech.local", "http://10.77.0.70"].includes(
                url.origin,
              ) &&
              !url.username &&
              !url.password &&
              serviceIds.some((id) => id.startsWith("ot-"))
            ) {
              onOt();
              return;
            }
            const entry = Object.entries(BROWSER_LABS).find(
              ([, lab]) => new URL(lab.home).origin === url.origin,
            );
            if (
              entry &&
              serviceIds.includes(entry[0]) &&
              hasBrowserLab(entry[0])
            )
              onVisit(entry[0]);
            else setError("No se encuentra ese servicio en la intranet.");
          } catch {
            setError("Introduce una dirección interna completa.");
          }
        }}
      >
        <label>
          Dirección de intranet
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            required
            maxLength={512}
          />
        </label>
        <button>Abrir</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <div>
        {serviceIds.some((id) => id.startsWith("ot-")) && (
          <button onClick={onOt}>
            <Globe size={18} />
            <span>control.seventech.local</span>
          </button>
        )}
        {serviceIds.some((id) => id.startsWith("iot-")) && (
          <button onClick={onPrinter}>
            <Globe size={18} />
            <span>printer.seventech.local</span>
          </button>
        )}
        {serviceIds.filter(hasBrowserLab).map((id) => (
          <button key={id} onClick={() => onVisit(id)}>
            <Globe size={18} />
            <span>{new URL(BROWSER_LABS[id].home).hostname}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
