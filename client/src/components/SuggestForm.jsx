import { useState } from 'react';
import { sendSuggestion } from '../api.js';
import { MEATS, MEAT_ICON } from '../labels.js';

export default function SuggestForm({ onClose }) {
  const [form, setForm] = useState({ name: '', city: '', address: '', meats: [], evidence: '' });
  const [state, setState] = useState({ sending: false, message: '', error: '' });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggle = (m) =>
    setForm({ ...form, meats: form.meats.includes(m) ? form.meats.filter((x) => x !== m) : [...form.meats, m] });

  async function submit(e) {
    e.preventDefault();
    setState({ sending: true, message: '', error: '' });
    try {
      const res = await sendSuggestion(form);
      setState({ sending: false, message: res.message, error: '' });
    } catch (err) {
      setState({ sending: false, message: '', error: err.message });
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Add a place</h2>
        <p className="modal-sub">Butcher, shop, online seller or restaurant. We check every suggestion before it goes live.</p>
        {state.message ? (
          <>
            <p>{state.message}</p>
            <button type="button" className="btn btn-gold" onClick={onClose}>Close</button>
          </>
        ) : (
          <>
            <label>Name *<input required value={form.name} onChange={set('name')} /></label>
            <label>City *<input required value={form.city} onChange={set('city')} placeholder="Tallinn, Tartu, Narva…" /></label>
            <label>Address<input value={form.address} onChange={set('address')} /></label>
            <div className="chips" role="group" aria-label="Meats sold">
              {MEATS.map((m) => (
                <button type="button" key={m} className={`chip ${form.meats.includes(m) ? 'is-on' : ''}`} aria-pressed={form.meats.includes(m)} onClick={() => toggle(m)}>
                  {MEAT_ICON[m]} {m}
                </button>
              ))}
            </div>
            <label>How do you know it's halal?
              <textarea rows={3} value={form.evidence} onChange={set('evidence')} placeholder="Certificate on wall, supplier name, link…" />
            </label>
            {state.error && <div className="error">{state.error}</div>}
            <div className="row">
              <button type="button" className="link" onClick={onClose}>Cancel</button>
              <button className="btn btn-gold" disabled={state.sending}>{state.sending ? 'Sending…' : 'Send suggestion'}</button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
