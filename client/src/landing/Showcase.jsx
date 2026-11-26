import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { closes, prizeText } from '../components.jsx';
import { reducedMotion } from '../ui.jsx';

const TABS = [['HACKATHON', 'Hackathons'], ['CODING', 'Coding'], ['DESIGN', 'Design'], ['CASE STUDY', 'Case studies']];

// The live listing showcase from the previous landing page, same behaviour: pick a category and real listings
// rotate every few seconds (paused on hover/focus, static with reduced motion). Restyled to sit in the exhibition.
export default function Showcase() {
  const [tab, setTab] = useState(TABS[0][0]);
  const [items, setItems] = useState(null);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    let live = true;
    setI(0);
    api.listings({ type: tab, limit: 4, sort: 'deadline' })
      .then((r) => { if (live) { setItems(r.listings); setI(0); } })
      .catch(() => { if (live) setItems([]); });
    return () => { live = false; };
  }, [tab]);
  useEffect(() => {
    if (paused || !items || items.length < 2 || reducedMotion()) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), 5200);
    return () => clearInterval(t);
  }, [paused, items]);
  // the rotation timer can tick between a tab change and the new list arriving: keep the index in range
  const k = items?.length ? i % items.length : 0;
  const cur = items?.[k];
  const prize = cur && prizeText(cur.prize);
  const c = cur && closes(cur.deadline);
  return (
    <div className="sc" aria-label="Live listings">
      <div className="sc-tabs" role="tablist" aria-label="Opportunity type">
        {TABS.map(([v, l]) => <button key={v} type="button" role="tab" aria-selected={tab === v} className={tab === v ? 'on' : ''} onClick={() => setTab(v)}>{l}</button>)}
      </div>
      <div className="sc-stage" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
        {cur ? (
          <Link key={cur.id} to={`/listing/${cur.id}`} className="sc-card">
            <span className="sc-top"><span className="sc-live"><i /> {cur.mode?.toLowerCase()}</span><span className={`sc-due ${c.tone}`}>{c.text}</span></span>
            <span className="sc-title">{cur.title}</span>
            <span className="sc-org">{cur.organiser || 'Open to builders everywhere'} · {cur.platform}</span>
            <span className="sc-bottom">
              <span className="sc-prize"><small>Prize</small><b>{prize ? prize.text : 'See listing'}</b></span>
              <span className="sc-fee"><small>Entry</small><b>{/free/i.test(cur.fee) ? 'Free' : cur.fee}</b></span>
              <span className="sc-go">View <span aria-hidden="true">→</span></span>
            </span>
          </Link>
        ) : (
          <div className="sc-card sc-empty">{items ? 'No open listings in this category right now.' : 'Loading live listings…'}</div>
        )}
        {items?.length > 1 && (
          <div className="sc-dots" role="group" aria-label="Choose listing">
            {items.map((x, n) => <button key={x.id} type="button" className={n === k ? 'on' : ''} aria-label={`Show ${x.title}`} aria-pressed={n === k} onClick={() => setI(n)} />)}
          </div>
        )}
      </div>
    </div>
  );
}
