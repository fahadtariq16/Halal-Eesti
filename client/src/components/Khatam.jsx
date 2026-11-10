// Layered eight-point star (khatam). Each ring draws itself on load, then the whole star turns slowly.
const ring = (r, rot) => {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI / 8) * i + rot;
    const rr = i % 2 === 0 ? r : r * 0.72;
    pts.push(`${(200 + rr * Math.cos(a)).toFixed(1)},${(200 + rr * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
};

export default function Khatam({ className = '' }) {
  const rings = [190, 150, 112, 76, 44];
  return (
    <svg className={`khatam ${className}`} viewBox="0 0 400 400" aria-hidden="true">
      <defs>
        <linearGradient id="kh-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F4B23E" />
          <stop offset="0.55" stopColor="#F06A5D" />
          <stop offset="1" stopColor="#7FD8B6" />
        </linearGradient>
      </defs>
      <g className="khatam-spin">
        {rings.map((r, i) => (
          <polygon
            key={r}
            className="khatam-ring"
            style={{ '--i': i }}
            points={ring(r, i % 2 ? Math.PI / 16 : 0)}
            fill="none"
            stroke="url(#kh-g)"
            strokeWidth={i === 0 ? 2.5 : 1.6}
            pathLength="1"
          />
        ))}
        <circle cx="200" cy="200" r="16" fill="#F4B23E" className="khatam-core" />
      </g>
    </svg>
  );
}
