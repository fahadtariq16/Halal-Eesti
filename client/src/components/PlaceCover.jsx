import { useEffect, useState } from 'react';
import { getPhoto } from '../api.js';
import { coverFor } from '../labels.js';

/**
 * Cover image for a place, in order of preference:
 * 1. Our own photo (place.image) — taken by us or given by the owner.
 * 2. The place's logo (place.logo), shown whole in the centre.
 * 3. The place's Google photo, fetched live (only when `active`, i.e. on screen).
 * 4. Generated cover art.
 * Google photos always show the photographer credit, as Google's terms require.
 */
export default function PlaceCover({ place, active = true, linkCredit = false, className = '' }) {
  const [photo, setPhoto] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [ownBroken, setOwnBroken] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const useOwn = place.image && !ownBroken;
  const useLogo = !useOwn && place.logo && !logoBroken;

  useEffect(() => {
    if (useOwn || useLogo || !active || !place.googlePlaceId) return;
    let alive = true;
    getPhoto(place.id).then((p) => { if (alive) setPhoto(p); });
    return () => { alive = false; };
  }, [place.id, place.googlePlaceId, active, useOwn, useLogo]);

  const [a, b, ink] = coverFor(place);
  const branch = place.name.match(/\((.*?)\)/)?.[1];
  const label = (branch && !/[؀-ۿ]/.test(branch) ? branch : place.name.replace(/\(.*?\)/g, ''))
    .split(/\s+/).filter((w) => /^[\p{L}]/u.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const hash = [...place.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const src = useOwn ? place.image : photo?.url;
  const credit = !useOwn && photo?.attributions?.[0];

  return (
    <div className={`cover ${className} ${src && loaded ? 'has-photo' : ''}`}
      style={{ background: `radial-gradient(120% 90% at ${55 + (hash % 30)}% 0%, ${a} 0%, ${b} 70%)` }}>
      <svg className="cover-star" viewBox="0 0 100 100" style={{ transform: `rotate(${(hash % 8) * 11}deg)` }} aria-hidden="true">
        <g fill="none" stroke={ink} strokeOpacity="0.22" strokeWidth="0.8">
          <rect x="22" y="22" width="56" height="56" />
          <rect x="22" y="22" width="56" height="56" transform="rotate(45 50 50)" />
          <rect x="32" y="32" width="36" height="36" />
          <rect x="32" y="32" width="36" height="36" transform="rotate(45 50 50)" />
          <circle cx="50" cy="50" r="9" />
        </g>
      </svg>
      {useLogo ? (
        <img
          className="cover-logo"
          src={place.logo}
          alt={`${place.name} logo`}
          loading="lazy"
          onError={() => setLogoBroken(true)}
        />
      ) : (
        <span className="cover-mark" style={{ color: ink }} aria-hidden="true">{label}</span>
      )}

      {src && !useLogo && (
        <img
          className="cover-photo"
          src={src}
          alt={`${place.name}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => (useOwn ? setOwnBroken(true) : setPhoto(null))}
        />
      )}

      {credit && loaded && (
        <span className="cover-credit">
          Photo: {linkCredit && credit.uri
            ? <a href={credit.uri} target="_blank" rel="noreferrer">{credit.name}</a>
            : credit.name} · Google Maps
        </span>
      )}
    </div>
  );
}
