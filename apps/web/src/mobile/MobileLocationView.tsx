type Sample = { time: string; position: number[] };
export default function MobileLocationView({
  data,
}: {
  data: { zones: Record<string, number[]>; samples: Sample[] };
}) {
  const points = data.samples
    .map((s) => `${25 + s.position[0] * 25},${240 - s.position[1] * 30}`)
    .join(" ");
  return (
    <div className="mobile-location-view">
      <h2>Historial de posiciones</h2>
      <svg
        viewBox="0 0 300 270"
        role="img"
        aria-label="Recorrido en la cuadrícula local del recinto"
      >
        <defs>
          <pattern
            id="mobile-map-grid"
            width="25"
            height="30"
            patternUnits="userSpaceOnUse"
          >
            <rect width="25" height="30" fill="#f0eee7" />
            <path d="M25 0H0V30" fill="none" stroke="#d8d7d0" />
          </pattern>
        </defs>
        <rect width="300" height="270" fill="url(#mobile-map-grid)" />
        <path d="M0 170H300M80 0V270" stroke="#fff" strokeWidth="14" />
        <polyline
          points={points}
          fill="none"
          stroke="#3d80b7"
          strokeWidth="3"
          strokeDasharray="5 3"
        />
        {Object.entries(data.zones).map(([zone, p]) => (
          <g
            key={zone}
            transform={`translate(${25 + p[0] * 25} ${240 - p[1] * 30})`}
          >
            <circle r="7" fill="#215a8b" stroke="white" strokeWidth="3" />
            <text y="-15" textAnchor="middle" fontSize="12" fill="#24354a">
              {zone}
            </text>
          </g>
        ))}
      </svg>
      <small>Cuadrícula local ficticia · Horas UTC</small>
      <ol>
        {data.samples.map((s, i) => (
          <li key={i}>
            <time>{s.time}</time>
            <span>Posición {s.position.join(", ")}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
