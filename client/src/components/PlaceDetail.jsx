import { useEffect, useRef, useState } from 'react';
import MenuView from './MenuView.jsx';
import PlaceCover from './PlaceCover.jsx';
import { MEAT_ICON, STATUS, TYPE } from '../labels.js';

export default function PlaceDetail({ place, onClose, onShowOnMap }) {
  const closeRef = useRef(null);
  const [tab, setTab] = useState('about');
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const status = STATUS[place.halalStatus] ?? STATUS.customer_reports;
  const q = place.googlePlaceId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.googlePlaceId}`
    : place.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.address}`)}` : null;
  const host = (s) => { try { const u = new URL(s); return u.hostname.includes('google.') ? 'Google Maps' : u.hostname.replace('www.', ''); } catch { return s; } };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h" onClick={(e) => e.stopPropagation()}>
        <PlaceCover place={place} className="sheet-cover" linkCredit />
        <button ref={closeRef} className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="sheet-body">
          <p className="sheet-type">{TYPE[place.type]} in {place.city}{place.delivery && place.type !== 'online' ? ' · delivers' : ''}</p>
          <h2 id="sheet-h">{place.name}</h2>
          <p className="sheet-address">{place.address || 'Address not confirmed yet.'}</p>

          {place.hasMenu && (
            <div className="sheet-tabs" role="tablist">
              <button role="tab" aria-selected={tab === 'about'} className="sheet-tab" onClick={() => setTab('about')}>About</button>
              <button role="tab" aria-selected={tab === 'menu'} className="sheet-tab" onClick={() => setTab('menu')}>Menu & prices</button>
            </div>
          )}

          {tab === 'menu' && place.hasMenu ? <MenuView placeId={place.id} /> : <>

          <div className={`evidence evidence-${status.tone}`}>
            <strong>{status.label}.</strong> {status.help}
          </div>

          {place.meats.length > 0 && (
            <p className="sheet-meats">
              {place.meats.map((m) => <span key={m}>{MEAT_ICON[m]} {m}</span>)}
            </p>
          )}

          {place.notes && <p className="sheet-notes">{place.notes}</p>}

          <div className="sheet-actions">
            {q && <a className="btn btn-gold" href={q} target="_blank" rel="noreferrer">Get directions</a>}
            {place.lat != null && <button className="btn btn-line" onClick={onShowOnMap}>Show on map</button>}
          </div>

          <p className="sheet-sources">
            Sources:{' '}
            {place.sources.map((s, i) => (
              <span key={s}><a href={s} target="_blank" rel="noreferrer">{host(s)}</a>{i < place.sources.length - 1 ? ', ' : ''}</span>
            ))}
            . Checked {new Date(place.lastChecked).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
          </>}
        </div>
      </div>
    </div>
  );
}
