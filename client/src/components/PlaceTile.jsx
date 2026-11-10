import PlaceCover from './PlaceCover.jsx';
import { Stars } from './Stars.jsx';
import { useReveal, useTilt } from '../hooks.js';
import { MEAT_ICON, STATUS, TYPE } from '../labels.js';

export default function PlaceTile({ place, index, onOpen }) {
  const [revealRef, inView] = useReveal();
  const tiltRef = useTilt(7);
  const status = STATUS[place.halalStatus] ?? STATUS.customer_reports;
  const street = place.address ? place.address.split(',')[0] : 'Address not confirmed';

  return (
    <article ref={revealRef} className={`tile ${inView ? 'is-in' : ''}`} style={{ '--d': `${(index % 8) * 55}ms` }}>
      <button ref={tiltRef} className="tile-hit" onClick={onOpen} aria-label={`Open ${place.name}`}>
        <span className="tile-glare" aria-hidden="true" />
        <PlaceCover place={place} active={inView} />
        <span className="tile-type">{TYPE[place.type]}{place.delivery && place.type !== 'online' ? ' · delivers' : ''}</span>
        {place.hasMenu && <span className="tile-menu">Menu</span>}
        <div className="tile-body">
          <h3>{place.name}</h3>
          <p className="tile-where">{place.city}, {street}</p>
          {place.reviewCount > 0 && (
            <p className="tile-rating">
              <Stars value={place.rating} size="0.85rem" /> <strong>{place.rating.toFixed(1)}</strong>
              <span className="muted"> ({place.reviewCount})</span>
            </p>
          )}
          <div className="tile-foot">
            <span className="tile-meats">
              {place.meats.length
                ? place.meats.map((m) => <span key={m} title={m}>{MEAT_ICON[m]}</span>)
                : <span className="muted">Meats unconfirmed</span>}
            </span>
            <span className={`badge badge-${status.tone}`}>{status.label}</span>
          </div>
        </div>
      </button>
    </article>
  );
}
