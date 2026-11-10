import { useState } from 'react';

/** Read-only stars. Rounds to the nearest half for display. */
export function Stars({ value, size = '1rem' }) {
  const v = Math.round((value ?? 0) * 2) / 2;
  return (
    <span className="stars" style={{ fontSize: size }} aria-label={`${value ?? 0} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`star ${v >= i ? 'full' : v >= i - 0.5 ? 'half' : ''}`} aria-hidden="true">★</span>
      ))}
    </span>
  );
}

/** Star picker built from radio buttons, so it works with keyboard and screen readers. */
export function StarInput({ value, onChange, name = 'rating' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const words = ['', 'Bad', 'Poor', 'Okay', 'Good', 'Excellent'];
  return (
    <fieldset className="star-input" onMouseLeave={() => setHover(0)}>
      <legend>Your rating</legend>
      <div className="star-input-row">
        {[1, 2, 3, 4, 5].map((i) => (
          <label key={i} className={`star-pick ${shown >= i ? 'on' : ''}`} onMouseEnter={() => setHover(i)}>
            <input type="radio" name={name} value={i} checked={value === i} onChange={() => onChange(i)} />
            <span aria-hidden="true">★</span>
            <span className="sr-only">{i} star{i > 1 ? 's' : ''}</span>
          </label>
        ))}
        <span className="star-word" aria-live="polite">{words[shown] || 'Tap a star'}</span>
      </div>
    </fieldset>
  );
}
