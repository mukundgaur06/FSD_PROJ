import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { makePose } from './DepthScene.js';
import { mountScene, placePoster } from './stage.js';
import { smooth, track } from './motion.js';
import { PHOTOS, url } from './assets.js';

export const NAV_H = 64;
const HALL_ASPECT = PHOTOS.hall.w / PHOTOS.hall.h;
const WARM = [1, 0.66, 0.3];   // the bulbs' own colour, sampled from the photograph
const GREEN = [0.18, 1, 0.6];  // the stage rig's own colour

// One documentary shot in five scenes, keyed on scroll progress p (0..1):
//   01 arrival 0-.04 · 02 push-in to the stage .04-.36 · 03 pull back and rise .36-.56
//   04 lights up .56-.78 · 05 settle into the final wide frame .78-1
// Frame = the visible rectangle of the photo inside the viewport (insets in px), plus scrim strengths.
// Camera = position (x, y, z), rotation (yaw, pitch), lens zoom and framing point (fu, fv), light levels.
function buildTracks(W, H) {
  const tall = W / H < 0.9;
  const g = tall ? 10 : Math.round(Math.min(28, Math.max(12, W * 0.016)));
  const open = { t: NAV_H + (tall ? 0 : 4), r: g, b: g, l: g, st: 0, sb: 0.9 };
  const full = { t: 0, r: 0, b: 0, l: 0 };
  let frame, cam, printBottom = 0;
  if (tall) {
    // Phones: an immersive vertical slice (stage + bulbs) that pulls back into the whole photograph, framed.
    const pw = W - 24, ph = pw / HALL_ASPECT, pt = Math.round(NAV_H + H * 0.12);
    printBottom = Math.round(pt + ph);
    const print = { t: pt, r: 12, b: Math.max(0, H - pt - ph), l: 12, st: 0, sb: 0 };
    frame = track([[0, open], [0.04, open], [0.18, { ...full, st: 0.85, sb: 0.45 }], [0.4, { ...full, st: 0.85, sb: 0.3 }], [0.56, print], [1, print]]);
    const P0 = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, zoom: 1.02, fu: 0.37, fv: 0.5, k: 0.5, exposure: 0.95, hiGain: 0.8, warm: 0.1, green: 0.08 };
    const wide = { ...P0, x: 0, y: 0.015, z: -0.01, pitch: -0.012, zoom: 1.05, fu: 0.5, fv: 0.5 };
    cam = track([
      [0, P0], [0.04, P0],
      [0.36, { ...P0, x: -0.075, y: 0.012, z: -0.3, yaw: 0.05, fu: 0.34, fv: 0.46 }],
      [0.56, wide], [0.62, wide],
      [0.78, { ...wide, y: 0.012, exposure: 1, hiGain: 1.15, warm: 0.62, green: 0.5 }],
      [1, { ...wide, x: 0.008, y: 0.01, z: -0.03, zoom: 1.06, exposure: 1, hiGain: 1.1, warm: 0.52, green: 0.42 }],
    ]);
  } else {
    frame = track([
      [0, open], [0.04, open],
      [0.2, { ...full, st: 0.8, sb: 0.4 }], [0.36, { ...full, st: 0.8, sb: 0.25 }], [0.56, { ...full, st: 0.8, sb: 0.3 }],
      [0.64, { ...full, st: 0.8, sb: 0.8 }], [0.8, { ...full, st: 0.8, sb: 0.8 }], [0.9, { ...full, st: 0.8, sb: 0.92 }], [1, { ...full, st: 0.8, sb: 0.92 }],
    ]);
    const C0 = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, zoom: 1.12, fu: 0.5, fv: 0.47, k: 0.5, exposure: 0.95, hiGain: 0.8, warm: 0.1, green: 0.08 };
    const wide = { ...C0, x: 0, y: 0.06, z: -0.02, pitch: -0.05, zoom: 1.05, fu: 0.5, fv: 0.52 };
    cam = track([
      [0, C0], [0.04, C0],
      [0.36, { ...C0, x: -0.085, y: 0.02, z: -0.32, yaw: 0.1, pitch: 0.01, fu: 0.45, fv: 0.45 }],
      [0.56, wide], [0.62, wide],
      [0.78, { ...wide, x: 0.005, zoom: 1.06, exposure: 1, hiGain: 1.15, warm: 0.62, green: 0.5 }],
      [1, { ...wide, x: 0.02, y: 0.05, z: -0.06, yaw: -0.01, pitch: -0.04, zoom: 1.08, fu: 0.53, fv: 0.5, exposure: 1, hiGain: 1.1, warm: 0.52, green: 0.42 }],
    ]);
  }
  return { frame, cam, tall, printBottom };
}

const fmt = (n) => Math.round(n).toLocaleString('en-IN');

export default function Hero({ stats, user, still }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const r = {
    root: useRef(null), stage: useRef(null), poster: useRef(null), canvas: useRef(null), mark: useRef(null),
    kicker: useRef(null), cue: useRef(null), cap: useRef(null), stat: useRef(null), num: useRef(null), final: useRef(null), act: useRef(null),
  };
  const open = stats?.open;
  const openRef = useRef(open);
  openRef.current = open;
  const refresh = useRef(() => {});
  useEffect(() => { refresh.current(); }, [open]); // stats arrived: redraw the count at the current scroll position

  useLayoutEffect(() => {
    const root = r.root.current, stage = r.stage.current, poster = r.poster.current, canvas = r.canvas.current;
    if (still) return undefined; // reduced motion / no WebGL2: a composed still frame, laid out by CSS
    const S = { p: 0 };
    const pose = makePose();
    const fr = {};
    let W = 0, H = 0, T = null, lastP = -1, shownNum = '', ready = false;
    const frameRect = { x: 0, y: 0, w: 1, h: 1 };
    const measure = () => {
      W = stage.clientWidth; H = stage.clientHeight; T = buildTracks(W, H); lastP = -1;
      if (T.printBottom) stage.style.setProperty('--print-bottom', `${T.printBottom}px`); // text sits under the print
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    refresh.current = () => { lastP = -1; shownNum = null; };

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.75, invalidateOnRefresh: true },
      });
      tl.to(S, { p: 1, duration: 1 }, 0);
      tl.to(r.cue.current, { autoAlpha: 0, duration: 0.03 }, 0.015);
      tl.to(r.kicker.current, { autoAlpha: 0, y: -14, duration: 0.05, ease: 'power1.in' }, 0.04);
      tl.to(r.mark.current, { yPercent: -16, autoAlpha: 0, duration: 0.09, ease: 'power2.in' }, 0.05);
      tl.fromTo(r.cap.current, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0.17);
      tl.to(r.cap.current, { autoAlpha: 0, y: -18, duration: 0.05, ease: 'power2.in' }, 0.31);
      tl.fromTo(r.stat.current, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 0.07, ease: 'power2.out' }, 0.6);
      tl.to(r.stat.current, { autoAlpha: 0, y: -26, duration: 0.05, ease: 'power2.in' }, 0.79);
      r.final.current.querySelectorAll('.hx-hl').forEach((line, n) => {
        tl.fromTo(line, { yPercent: 112 }, { yPercent: 0, duration: 0.07, ease: 'power3.out' }, 0.83 + n * 0.016);
      });
      tl.fromTo(r.act.current, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0.9);
    }, root);

    const update = (dt, t, scene, dirty) => {
      const p = S.p;
      // ambient life: a slow drift and breathing bulbs in the opening, a faint glow once the lights are up
      const amb = 1 - smooth(0, 0.05, p);
      const hold = smooth(0.9, 1, p);
      const moving = p !== lastP;
      if (moving) {
        T.frame(p, fr);
        const st = stage.style;
        st.setProperty('--ft', `${fr.t}px`); st.setProperty('--fr', `${fr.r}px`); st.setProperty('--fb', `${fr.b}px`); st.setProperty('--fl', `${fr.l}px`);
        st.setProperty('--st', fr.st.toFixed(3)); st.setProperty('--sb', fr.sb.toFixed(3));
        frameRect.x = fr.l; frameRect.y = fr.t; frameRect.w = Math.max(1, W - fr.l - fr.r); frameRect.h = Math.max(1, H - fr.t - fr.b);
        // the live count rises with the lights
        const n = openRef.current;
        const txt = Number.isFinite(n) ? fmt(n * (1 - (1 - smooth(0.6, 0.72, p)) ** 3)) : '';
        if (txt !== shownNum) { r.num.current.textContent = txt; shownNum = txt; }
        lastP = p;
      }
      T.cam(p, pose);
      if (!ready) { placePoster(poster, frameRect, 'hall', pose); }
      if (!scene) return null;
      if (!moving && !dirty && amb < 0.001 && hold < 0.001) return null; // nothing changed: skip the draw
      if (amb > 0) {
        pose.x += amb * 0.006 * Math.sin(t * 0.33);
        pose.y += amb * 0.004 * Math.sin(t * 0.26 + 1.3);
        pose.z += amb * 0.012 * Math.sin(t * 0.21 + 0.4);
      }
      const breath = amb + hold * 0.5;
      const bw = pose.warm + breath * 0.07 * (0.5 + 0.5 * Math.sin(t * 1.05));
      const bg = pose.green + breath * 0.08 * (0.5 + 0.5 * Math.sin(t * 0.7 + 2));
      pose.glowA[0] = WARM[0] * bw; pose.glowA[1] = WARM[1] * bw; pose.glowA[2] = WARM[2] * bw;
      pose.glowB[0] = GREEN[0] * bg; pose.glowB[1] = GREEN[1] * bg; pose.glowB[2] = GREEN[2] * bg;
      scene.frame = frameRect;
      return pose;
    };
    const driver = mountScene(canvas, 'hall', {
      observe: root, margin: '0px', grid: 220, update,
      onReady: () => { ready = true; canvas.dataset.ready = ''; },
    });
    return () => { driver.destroy(); ro.disconnect(); ctx.revert(); };
  }, [still]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (e) => { e.preventDefault(); nav(`/browse${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); };

  return (
    <section className={`hx${still ? ' is-still' : ''}`} ref={r.root} aria-labelledby="hx-title">
      <div className="hx-stage" ref={r.stage}>
        <div className="hx-frame" data-intro="frame">
          <img className="hx-poster" ref={r.poster} src={url('hall.jpg')} alt={PHOTOS.hall.alt} width={PHOTOS.hall.w} height={PHOTOS.hall.h} fetchPriority="high" decoding="async" />
          <canvas className="hx-canvas lx-gl" ref={r.canvas} aria-hidden="true" />
          <div className="hx-scrim" aria-hidden="true" />
        </div>

        <div className="hx-mark" ref={r.mark}>
          <h1 id="hx-title" className="hx-wordmark">
            <span className="lx-mask"><span className="hx-word" data-intro="word">Hack</span><span className="hx-word lime" data-intro="word">Elite</span></span>
            <span className="visually-hidden"> — every open hackathon, ranked for you</span>
          </h1>
        </div>
        <div className="hx-kicker" ref={r.kicker} aria-hidden="true"><p data-intro="support">Every open hackathon,<br />ranked for you.</p></div>
        <div className="hx-cue" ref={r.cue} aria-hidden="true"><p data-intro="support"><span>Scroll</span><i /></p></div>

        <div className="hx-cap" ref={r.cap} aria-hidden="true">
          <p className="lx-k">01 — Into the hall</p>
          <p className="hx-cap-line">Long tables, warm bulbs, and one stage at the end of the room.</p>
        </div>

        <div className="hx-stat" ref={r.stat}>
          {Number.isFinite(open) ? (
            <>
              <b className="hx-num" ref={r.num} aria-hidden="true">{still ? fmt(open) : null}</b>
              <span className="visually-hidden">{fmt(open)}</span>
              <span className="hx-stat-label">open right now</span>
            </>
          ) : (
            <>
              <b className="hx-num hx-num-word" ref={r.num} aria-hidden="true" />
              <span className="hx-stat-label">Every open hackathon, in one feed.</span>
            </>
          )}
          <small className="lx-k">16 live sources · refreshed hourly</small>
        </div>

        <div className="hx-final" ref={r.final}>
          <h2 className="hx-head">
            <span className="lx-mask"><span className="hx-hl">Your next big idea</span></span>
            <span className="lx-mask"><span className="hx-hl">deserves a <em>big stage.</em></span></span>
          </h2>
          <div className="hx-act" ref={r.act}>
            <form className="hx-search" role="search" onSubmit={go}>
              <label className="visually-hidden" htmlFor="hx-q">Search opportunities</label>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
              <input id="hx-q" type="search" placeholder="Try AI, climate, design…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
              <button className="btn primary">Explore <span aria-hidden="true">→</span></button>
            </form>
            <Link className="lx-link" to={user ? '/for-you' : '/register'}>{user ? 'See your personal matches' : 'Create a free account'} <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
