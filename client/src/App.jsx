import { useEffect, useState } from 'react';
import { getPlaces, getMeta } from './api.js';
import Hero from './components/Hero.jsx';
import Ticker from './components/Ticker.jsx';
import Doors from './components/Doors.jsx';
import PlaceTile from './components/PlaceTile.jsx';
import PlaceDetail from './components/PlaceDetail.jsx';
import PlacesMap from './components/PlacesMap.jsx';
import EvidenceGuide from './components/EvidenceGuide.jsx';
import SuggestForm from './components/SuggestForm.jsx';
import Pagination from './components/Pagination.jsx';
import { GROUPS, MEATS, MEAT_ICON, STATUS } from './labels.js';

const EMPTY = { q: '', city: '', meat: '', status: '' };
const PER_PAGE = 10;

export default function App() {
  const [group, setGroup] = useState('sellers');
  const [filters, setFilters] = useState(EMPTY);
  const [meta, setMeta] = useState(null);
  const [all, setAll] = useState([]);
  const [places, setPlaces] = useState([]);       // current page, for the cards
  const [mapPlaces, setMapPlaces] = useState([]); // all matches, for the map
  const [page, setPage] = useState(1);
  const [paging, setPaging] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [mapId, setMapId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [reloadKey, setReloadKey] = useState(0); // bump to refetch after a new review
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    getMeta().then(setMeta).catch(() => {});
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // All places (for the detail sheet). Refetched after a new review so ratings update.
  useEffect(() => {
    getPlaces().then((r) => setAll(r.data)).catch(() => {});
  }, [reloadKey]);

  // Any filter or tab change starts again from page 1.
  useEffect(() => { setPage(1); }, [filters, group]);

  // Cards: one page at a time.
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      getPlaces({ ...filters, group, page, limit: PER_PAGE })
        .then((r) => {
          setPlaces(r.data);
          setPaging({ total: r.count, pages: r.pages });
          if (r.page !== page) setPage(r.page);
          setError('');
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [filters, group, page, reloadKey]);

  // Map: every match, not just this page.
  useEffect(() => {
    const t = setTimeout(() => {
      getPlaces({ ...filters, group }).then((r) => setMapPlaces(r.data)).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [filters, group]);

  function goToPage(n) {
    setPage(n);
    scrollTo('explore');
  }

  const set = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const toggle = (key, value) => setFilters((f) => ({ ...f, [key]: f[key] === value ? '' : value }));
  const active = Object.values(filters).some(Boolean);
  const open = all.find((p) => p.id === openId);
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  function pickGroup(g) { setGroup(g); scrollTo('explore'); }
  function showOnMap(id) { setOpenId(null); setMapId(id); scrollTo('map'); }

  return (
    <>
      <a className="skip" href="#explore">Skip to places</a>
      <header className={`nav ${scrolled ? 'is-solid' : ''}`}>
        <a href="#top" className="wordmark"><span className="wm-star" aria-hidden="true">✦</span> Halal Eesti</a>
        <nav aria-label="Main">
          <button className="nav-link" onClick={() => pickGroup('sellers')}>Butchers & shops</button>
          <button className="nav-link" onClick={() => pickGroup('restaurants')}>Restaurants</button>
          <button className="nav-link" onClick={() => scrollTo('map')}>Map</button>
          <button className="btn btn-gold btn-sm" onClick={() => setShowForm(true)}>Add a place</button>
        </nav>
      </header>

      <main>
        <Hero all={all} meta={meta} query={filters.q} onSearch={(v) => set('q', v)}
          onGo={() => scrollTo('explore')} onOpen={setOpenId} />
        <Ticker places={all} onOpen={setOpenId} />
        <Doors meta={meta} group={group} onPick={pickGroup} />

        <section className="explore" id="explore" aria-labelledby="explore-h">
          <h2 id="explore-h" className="sr-only">Places</h2>
          <div className="explore-bar">
            <div className="tabs" role="tablist" aria-label="Type of place" data-active={group}>
              <span className="tabs-ink" aria-hidden="true" />
              {Object.entries(GROUPS).map(([k, g]) => (
                <button key={k} role="tab" aria-selected={group === k} className="tab" onClick={() => setGroup(k)}>
                  {g.label}
                  {meta && <span className="tab-n">{meta.groups[k]}</span>}
                </button>
              ))}
            </div>

            <div className="filters">
              <div className="chips" role="group" aria-label="City">
                {meta?.cities.map((c) => (
                  <button key={c} className={`chip ${filters.city === c ? 'is-on' : ''}`} aria-pressed={filters.city === c}
                    onClick={() => toggle('city', c)}>{c}</button>
                ))}
              </div>
              <div className="chips" role="group" aria-label="Meat">
                {MEATS.map((m) => (
                  <button key={m} className={`chip ${filters.meat === m ? 'is-on' : ''}`} aria-pressed={filters.meat === m}
                    onClick={() => toggle('meat', m)}><span aria-hidden="true">{MEAT_ICON[m]}</span> {m}</button>
                ))}
              </div>
              <select value={filters.status} onChange={(e) => set('status', e.target.value)} aria-label="Halal evidence">
                <option value="">Any halal evidence</option>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {active && <button className="link" onClick={() => setFilters(EMPTY)}>Clear</button>}
            </div>
          </div>

          <p className="result-line" aria-live="polite">
            {loading ? 'Loading…' : paging.total === 0 ? `0 ${group === 'sellers' ? 'butchers & shops' : 'restaurants'}`
              : `Showing ${(page - 1) * PER_PAGE + 1}–${(page - 1) * PER_PAGE + places.length} of ${paging.total} ${group === 'sellers' ? 'butchers & shops' : 'restaurants'}`}
            {filters.q && !loading && ` matching “${filters.q}”`}
          </p>

          {error && <div className="error">Places could not load: {error}. Start the API with <code>npm run dev</code> in the server folder.</div>}

          {!loading && !error && places.length === 0 && (
            <div className="empty">
              <h3>{filters.meat === 'goat' ? 'No goat sellers listed yet' : 'Nothing matches these filters'}</h3>
              <p>{filters.meat === 'goat'
                ? 'If you buy halal goat somewhere in Estonia, add it so others can find it.'
                : `Try clearing a filter or switch to ${group === 'sellers' ? 'Restaurants' : 'Butchers & shops'}.`}</p>
              <div className="empty-actions">
                <button className="btn btn-gold" onClick={() => setShowForm(true)}>Add a place</button>
                <button className="btn btn-line" onClick={() => setFilters(EMPTY)}>Clear filters</button>
              </div>
            </div>
          )}

          <div className="grid" key={`${group}-${page}`}>
            {places.map((p, i) => <PlaceTile key={p.id} place={p} index={i} onOpen={() => setOpenId(p.id)} />)}
          </div>

          {!error && <Pagination page={page} pages={paging.pages} onChange={goToPage} />}
        </section>

        <section className="map-section" id="map" aria-labelledby="map-h">
          <div className="section-head">
            <h2 id="map-h">On the map</h2>
            <p>Showing {group === 'sellers' ? 'butchers & shops' : 'restaurants'}. Pin colour shows the halal evidence.</p>
          </div>
          <div className="map-wrap">
            <PlacesMap places={mapPlaces} selectedId={mapId} onSelect={setOpenId} />
          </div>
        </section>

        <EvidenceGuide />

        <section className="business">
          <div className="business-copy">
            <h2>Run a halal butcher, shop or restaurant?</h2>
            <p>Get listed for free. Send us your halal certificate or supplier details and we’ll mark your listing as checked, add your photos and opening hours.</p>
          </div>
          <button className="btn btn-gold btn-lg" onClick={() => setShowForm(true)}>List your business</button>
        </section>
      </main>

      <footer className="footer">
        <span className="wordmark"><span className="wm-star" aria-hidden="true">✦</span> Halal Eesti</span>
        <span>Listings checked November 2026. Always confirm halal status with the venue.</span>
        <span>Map © OpenStreetMap contributors</span>
      </footer>

      {open && <PlaceDetail place={open} onClose={() => setOpenId(null)} onShowOnMap={() => { setGroup(['butcher','shop','online'].includes(open.type) ? 'sellers' : 'restaurants'); showOnMap(open.id); }} onReviewAdded={() => setReloadKey((k) => k + 1)} />}
      {showForm && <SuggestForm onClose={() => setShowForm(false)} />}
    </>
  );
}
