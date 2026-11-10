// A slow, endless strip of real place names. Pauses on hover; static when reduced motion is on.
export default function Ticker({ places, onOpen }) {
  if (!places.length) return null;
  const items = [...places, ...places];
  return (
    <div className="ticker" aria-label="All listed places">
      <div className="ticker-track">
        {items.map((p, i) => (
          <button key={`${p.id}-${i}`} className="ticker-item" onClick={() => onOpen(p.id)} tabIndex={i < places.length ? 0 : -1} aria-hidden={i >= places.length}>
            <span className="ticker-star" aria-hidden="true">✦</span>
            {p.name}
            <span className="ticker-city">{p.city}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
