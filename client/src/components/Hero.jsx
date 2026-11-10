import Khatam from './Khatam.jsx';
import { TYPE } from '../labels.js';

const FEATURED = ['anadolu-gourmet', 'halal-ee', 'dawat'];

export default function Hero({ all, meta, query, onSearch, onGo, onOpen }) {
  const featured = FEATURED.map((id) => all.find((p) => p.id === id)).filter(Boolean);

  return (
    <section className="hero" id="top">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-grid">
        <div className="hero-copy">
          <h1>
            <span className="line"><span>Halal meat</span></span>
            <span className="line"><span>in Estonia,</span></span>
            <span className="line"><span>found fast.</span></span>
          </h1>
          <p className="hero-lead">
            Butchers, shops and restaurants for halal chicken, beef, lamb and goat. Every listing shows where its
            halal claim comes from.
          </p>

          <form className="hero-search" role="search" onSubmit={(e) => { e.preventDefault(); onGo(); }}>
            <label htmlFor="hero-q" className="sr-only">Search places</label>
            <input id="hero-q" type="search" placeholder="Try “lamb”, “Tartu” or “Kopli”"
              value={query} onChange={(e) => onSearch(e.target.value)} />
            <button className="btn btn-gold">Search</button>
          </form>

          {meta && (
            <p className="hero-meta">
              <strong>{meta.groups.sellers}</strong> butchers and shops, <strong>{meta.groups.restaurants}</strong> restaurants
              in {meta.cities.join(', ')}.
            </p>
          )}
        </div>

        <div className="hero-art">
          <Khatam />
          {featured.map((p, i) => (
            <button key={p.id} className={`float-card fc-${i}`} onClick={() => onOpen(p.id)}>
              <span className="fc-type">{TYPE[p.type]}</span>
              <span className="fc-name">{p.name}</span>
              <span className="fc-city">{p.city}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
