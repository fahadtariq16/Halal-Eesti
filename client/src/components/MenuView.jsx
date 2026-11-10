import { useEffect, useState } from 'react';
import { getMenu } from '../api.js';

const eur = (n) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n);
const date = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export default function MenuView({ placeId }) {
  const [menu, setMenu] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let alive = true;
    setState('loading');
    getMenu(placeId)
      .then((m) => { if (alive) { setMenu(m); setState('ok'); } })
      .catch(() => { if (alive) setState('none'); });
    return () => { alive = false; };
  }, [placeId]);

  if (state === 'loading') return <p className="muted">Loading menu…</p>;
  if (state === 'none') return <p className="muted">No menu yet for this place.</p>;

  return (
    <div className="menu">
      {menu.notes && <p className="menu-note">{menu.notes}</p>}

      {menu.sections.map((s) => (
        <section key={s.name} className="menu-section">
          <h3>{s.name}</h3>
          <ul>
            {s.items.map((it) => (
              <li key={it.name} className={`menu-item ${it.image ? 'has-img' : ''}`}>
                {it.image && <img src={it.image} alt={it.name} loading="lazy" />}
                <div className="menu-text">
                  <span className="menu-name">{it.name}</span>
                  {it.description && <span className="menu-desc">{it.description}</span>}
                </div>
                {it.price != null && (
                  <span className="menu-price">{eur(it.price)}{it.unit ? <small> / {it.unit}</small> : null}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="menu-meta">
        {menu.priceType === 'delivery'
          ? `Delivery-app prices from ${menu.source?.label ?? 'the venue'}, checked ${date(menu.lastChecked)}. Prices in the restaurant may be lower, and may have changed.`
          : `Prices from ${menu.source?.label ?? 'the venue'}, checked ${date(menu.lastChecked)}. They may have changed.`}
      </p>

      {menu.links?.length > 0 && (
        <div className="menu-links">
          {menu.links.map((l) => (
            <a key={l.url} className="btn btn-gold" href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
          ))}
        </div>
      )}
    </div>
  );
}
