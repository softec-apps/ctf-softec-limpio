import { useState } from "react";
import {
  ArrowUpRight,
  Monitor,
  Router,
  Smartphone,
  ScanLine,
} from "lucide-react";
export default function OperationsScene({
  onDevice,
}: {
  onDevice: (device: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const devices = [
    {
      id: "computer",
      name: "Estación de trabajo",
      detail: "Abrir escritorio",
      icon: Monitor,
      x: 46,
      y: 50,
    },
    {
      id: "phone",
      name: "Teléfono",
      detail: "Inspeccionar dispositivo",
      icon: Smartphone,
      x: 66.5,
      y: 69,
    },
    {
      id: "router",
      name: "Router",
      detail: "Inspeccionar dispositivo",
      icon: Router,
      x: 22,
      y: 64,
    },
  ];
  return (
    <div className="operations-environment">
      <img
        src="/assets/seventech-operations.png"
        alt="Sala de operaciones nocturna con monitores, un teléfono y equipo de red sobre el escritorio."
        className="operations-image"
        fetchPriority="high"
      />
      <div className="environment-vignette" aria-hidden="true" />
      <div className="environment-grain" aria-hidden="true" />
      <div className="environment-location">
        <span className="environment-location-line" />
        <span>
          Laboratorio de investigación<span>Seventech / Estación 01</span>
        </span>
      </div>
      <div className="environment-instruction">
        <ScanLine size={15} />
        <span>Selecciona un dispositivo para investigar</span>
      </div>
      {devices.map((device) => (
        <button
          key={device.id}
          className={`environment-hotspot hotspot-${device.id}${hovered === device.id ? " is-hovered" : ""}`}
          style={{ left: `${device.x}%`, top: `${device.y}%` }}
          aria-label={`${device.name}: ${device.detail}`}
          onPointerEnter={() => setHovered(device.id)}
          onPointerLeave={() => setHovered(null)}
          onFocus={() => setHovered(device.id)}
          onBlur={() => setHovered(null)}
          onClick={() => onDevice(device.id)}
        >
          <span className="hotspot-target">
            <device.icon size={17} />
            <span className="hotspot-target-corner" />
          </span>
          <span className="hotspot-caption">
            <strong>{device.name}</strong>
            <span>
              {device.detail}
              <ArrowUpRight size={12} />
            </span>
          </span>
        </button>
      ))}
      <div className="scene-coordinate" aria-hidden="true">
        <i />
        ST / LAB — 01
      </div>
    </div>
  );
}
