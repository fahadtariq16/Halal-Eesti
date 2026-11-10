import { useEffect, useState } from 'react';
import { getReviews, sendReview } from '../api.js';
import { Stars, StarInput } from './Stars.jsx';

const HALAL = {
  yes: { label: 'Says it is halal', tone: 'ok' },
  no: { label: 'Says it is not halal', tone: 'low' },
  unsure: { label: 'Not sure about halal', tone: 'mid' }
};
const when = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const EMPTY = { name: '', rating: 0, text: '', halal: 'unsure', website: '' };

export default function ReviewsView({ place, onReviewAdded }) {
  const [list, setList] = useState(null);       // { count, average, halal, page, pages, data }
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [writing, setWriting] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState({ sending: false, errors: [], done: false });

  async function load(page = 1) {
    try {
      const r = await getReviews(place.id, page);
      setList(r);
      setItems((prev) => (page === 1 ? r.data : [...prev, ...r.data]));
      setError('');
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(1); }, [place.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (!form.rating) return setState({ ...state, errors: ['Please choose 1 to 5 stars.'] });
    setState({ sending: true, errors: [], done: false });
    try {
      await sendReview(place.id, form);
      setState({ sending: false, errors: [], done: true });
      setForm(EMPTY);
      setWriting(false);
      await load(1);
      onReviewAdded?.();
    } catch (err) {
      setState({ sending: false, errors: err.message.split(', '), done: false });
    }
  }

  if (error) return <p className="error">Reviews could not load: {error}</p>;
  if (!list) return <p className="muted">Loading reviews…</p>;

  const answered = list.halal.yes + list.halal.no;

  return (
    <div className="reviews">
      <div className="reviews-summary">
        {list.count > 0 ? (
          <>
            <span className="reviews-avg">{list.average.toFixed(1)}</span>
            <div>
              <Stars value={list.average} size="1.15rem" />
              <p className="muted">{list.count} review{list.count === 1 ? '' : 's'}</p>
            </div>
            {answered > 0 && (
              <p className="reviews-halal">
                <strong>{list.halal.yes} of {answered}</strong> reviewers say the place confirmed its meat is halal.
              </p>
            )}
          </>
        ) : (
          <p className="muted">No reviews yet. Been here? Be the first to tell others.</p>
        )}
      </div>

      {state.done && <p className="reviews-thanks" role="status">Thanks! Your review is now live.</p>}

      {!writing ? (
        <button className="btn btn-gold" onClick={() => { setWriting(true); setState({ sending: false, errors: [], done: false }); }}>
          Write a review
        </button>
      ) : (
        <form className="review-form" onSubmit={submit} noValidate>
          <StarInput value={form.rating} onChange={(rating) => setForm({ ...form, rating })} name={`rating-${place.id}`} />

          <fieldset className="halal-q">
            <legend>Did they confirm the meat is halal?</legend>
            <div className="halal-options">
              {[['yes', 'Yes, they confirmed'], ['no', 'No, it is not halal'], ['unsure', "I didn't ask / not sure"]].map(([v, l]) => (
                <label key={v} className={`chip ${form.halal === v ? 'is-on' : ''}`}>
                  <input type="radio" name={`halal-${place.id}`} value={v} checked={form.halal === v} onChange={set('halal')} />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>

          <label>Your review
            <textarea rows={4} maxLength={1000} value={form.text} onChange={set('text')}
              placeholder="What did you buy or eat? How was the quality, price and service?" required />
            <span className="char-count">{form.text.length}/1000</span>
          </label>

          <label>Your name
            <input value={form.name} onChange={set('name')} maxLength={40} placeholder="First name is enough" required />
          </label>

          {/* Hidden from people; bots fill it in and get ignored. */}
          <label className="hp" aria-hidden="true">Website
            <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
          </label>

          <p className="muted small">Your name and review are public. Don’t include phone numbers, emails or links.</p>

          {state.errors.length > 0 && (
            <ul className="error" role="alert">{state.errors.map((m) => <li key={m}>{m}</li>)}</ul>
          )}

          <div className="row">
            <button type="button" className="link" onClick={() => setWriting(false)}>Cancel</button>
            <button className="btn btn-gold" disabled={state.sending}>{state.sending ? 'Posting…' : 'Post review'}</button>
          </div>
        </form>
      )}

      {items.length > 0 && (
        <ul className="review-list">
          {items.map((r) => (
            <li key={r.id} className="review">
              <div className="review-head">
                <strong>{r.name}</strong>
                <Stars value={r.rating} size="0.9rem" />
                <span className="muted small">{when(r.createdAt)}</span>
              </div>
              <p className="review-text">{r.text}</p>
              <span className={`badge badge-${HALAL[r.halal]?.tone ?? 'mid'}`}>{HALAL[r.halal]?.label}</span>
            </li>
          ))}
        </ul>
      )}

      {list.page < list.pages && (
        <button className="btn btn-line" onClick={() => load(list.page + 1)}>Show more reviews</button>
      )}
    </div>
  );
}
