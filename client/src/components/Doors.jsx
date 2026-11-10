import { useTilt } from '../hooks.js';

function Door({ kind, title, text, count, onPick, active }) {
  const ref = useTilt(5);
  return (
    <button ref={ref} className={`door door-${kind} ${active ? 'is-on' : ''}`} onClick={onPick} aria-pressed={active}>
      <span className="door-shine" aria-hidden="true" />
      <span className="door-count">{count}</span>
      <span className="door-title">{title}</span>
      <span className="door-text">{text}</span>
      <span className="door-cta">See {count} {kind === 'sellers' ? 'sellers' : 'restaurants'}</span>
    </button>
  );
}

export default function Doors({ meta, group, onPick }) {
  if (!meta) return null;
  return (
    <section className="doors" aria-label="Choose what you need">
      <Door
        kind="sellers"
        title="Butchers & shops"
        text="Fresh and frozen halal meat to cook at home, including online delivery."
        count={meta.groups.sellers}
        active={group === 'sellers'}
        onPick={() => onPick('sellers')}
      />
      <Door
        kind="restaurants"
        title="Restaurants"
        text="Kebab, biryani, burgers and grills that serve halal meat."
        count={meta.groups.restaurants}
        active={group === 'restaurants'}
        onPick={() => onPick('restaurants')}
      />
    </section>
  );
}
