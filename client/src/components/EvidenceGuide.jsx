import { STATUS } from '../labels.js';
import { useReveal } from '../hooks.js';

export default function EvidenceGuide() {
  const [ref, inView] = useReveal();
  return (
    <section ref={ref} className={`guide ${inView ? 'is-in' : ''}`} aria-labelledby="guide-h">
      <div className="guide-text">
        <h2 id="guide-h">How we label halal</h2>
        <p>
          Estonia has no national halal certification body, so no one here can stamp a place as certified. Instead,
          every listing shows where its halal claim comes from strongest first.
        </p>
      </div>
      <ol className="guide-scale">
        {Object.entries(STATUS).map(([key, s]) => (
          <li key={key} className={`guide-step tone-${s.tone}`}>
            <span className={`badge badge-${s.tone}`}>{s.label}</span>
            <p>{s.help}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
