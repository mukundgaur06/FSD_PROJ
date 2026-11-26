import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { makePose } from './DepthScene.js';
import { mountScene, placePoster } from './stage.js';
import { cssColor, damp, onThemeChange, track } from './motion.js';
import { PHOTOS, sources, url } from './assets.js';
import Showcase from './Showcase.jsx';

// Slow, camera-only moves for each chapter, keyed on how far the visitor has walked through it (0..1).
// tabs: a dolly across the folders while they lift (depth grows; a 3D render, no people, so this is allowed)
// night: a push toward the monitor · team: a gentle parallax push, people untouched
const CAMS = {
  tabs: track([[0, { x: -0.02, y: 0, z: 0, yaw: 0.008, zoom: 1.03, fu: 0.5, fv: 0.52, k: 0.14 }], [1, { x: 0.02, y: 0.008, z: -0.07, yaw: -0.008, zoom: 1.03, fu: 0.5, fv: 0.5, k: 0.34 }]]),
  night: track([[0, { x: 0.02, y: 0, z: 0, yaw: 0, zoom: 1.05, fu: 0.44, fv: 0.4, k: 0.35 }], [1, { x: -0.012, y: 0.01, z: -0.24, yaw: 0, zoom: 1.05, fu: 0.42, fv: 0.36, k: 0.35 }]]),
  team: track([[0, { x: 0.035, y: 0, z: 0, yaw: 0, zoom: 1.05, fu: 0.5, fv: 0.55, k: 0.35 }], [1, { x: -0.035, y: 0.01, z: -0.12, yaw: 0, zoom: 1.05, fu: 0.5, fv: 0.55, k: 0.35 }]]),
};

function useWide() {
  const q = '(min-width: 900px)';
  const [wide, setWide] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

// One photograph in the exhibition. With motion it is a WebGL camera; without, the same photo as a still.
function Plate({ ch, i, still, prog, manual, onDriver }) {
  const box = useRef(null), canvas = useRef(null), poster = useRef(null);
  useEffect(() => {
    if (still) return undefined;
    const pose = makePose();
    const cam = CAMS[ch.key];
    let cur = prog.current[i], last = -1, ready = false;
    let tint = [0, 0, 0];
    const readTint = () => { const a = cssColor('--accent'), c = cssColor('--cyan'); tint = [0, 1, 2].map((k) => a[k] * 0.45 + c[k] * 0.55); };
    const glows = !!PHOTOS[ch.key].glow;
    if (glows) readTint();
    const d = mountScene(canvas.current, ch.key, {
      observe: manual ? null : box.current, grid: 160,
      update: (dt, t, scene, dirty) => {
        const target = prog.current[i];
        cur = Math.abs(cur - target) < 1e-4 ? target : damp(cur, target, 5, dt);
        const moved = cur !== last;
        cam(cur, pose);
        if (!ready) { const c = canvas.current; placePoster(poster.current, { x: 0, y: 0, w: c.clientWidth, h: c.clientHeight }, ch.key, pose); }
        if (!scene || (!moved && !dirty && !glows)) return null;
        last = cur;
        if (glows) { // the screens breathe, tinted toward the palette's electric blue / cyan
          const a = 0.3 + 0.09 * Math.sin(t * 0.85);
          pose.glowA[0] = tint[0] * a; pose.glowA[1] = tint[1] * a; pose.glowA[2] = tint[2] * a;
        }
        return pose;
      },
      onReady: () => { ready = true; canvas.current.dataset.ready = ''; },
    });
    const unTheme = glows ? onThemeChange(() => { readTint(); d.invalidate(); }) : () => {};
    onDriver?.(i, d);
    return () => { onDriver?.(i, null); d.destroy(); unTheme(); };
  }, [still, manual]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`ex-plate ex-${ch.key}`} ref={box} data-plate={i}>
      <div className="ex-plate-in">
        <div className="ex-photo">
          <picture>
            {sources(ch.key).map((s) => <source key={s.type} type={s.type} srcSet={s.srcSet} />)}
            <img ref={poster} src={url(`${ch.key}.jpg`)} alt={PHOTOS[ch.key].alt} width={PHOTOS[ch.key].w} height={PHOTOS[ch.key].h} loading="lazy" decoding="async" />
          </picture>
          <canvas ref={canvas} className="lx-gl" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

const CHAPTERS = [
  { key: 'tabs', title: 'Discover' },
  { key: 'night', title: 'Build' },
  { key: 'team', title: 'Team up' },
];

function Copy({ i, stats }) {
  const platforms = stats?.platforms?.map((p) => p.name) || [];
  const head = (
    <>
      <p className="lx-k ch-k"><span>{String(i + 1).padStart(2, '0')}</span> / 03</p>
      <h2 className="ch-title" id={`ch-${CHAPTERS[i].key}`}><span className="lx-mask"><span className="ch-tl">{CHAPTERS[i].title}</span></span></h2>
    </>
  );
  if (i === 0) return (
    <>
      {head}
      <p className="ch-lede" data-rise>16 live sources, refreshed hourly and de-duplicated into one feed.</p>
      <p className="ch-ask" data-rise>Ask in plain English, like <q>offline hackathons in Pune closing soon with 1L+ prize</q>. <Link className="lx-link" to="/ask">Ask HackElite <span aria-hidden="true">→</span></Link></p>
      <div data-rise><Showcase /></div>
      <p className="ch-sources" data-rise>
        {platforms.length > 0
          ? <><span className="lx-k">Live now from</span> {platforms.join(' · ')}{Number.isFinite(stats?.closingWeek) && <> · <b>{stats.closingWeek.toLocaleString('en-IN')}</b> closing this week</>}</>
          : <span className="lx-k">Devpost, Unstop, Devfolio and more, in one feed</span>}
      </p>
      <Link className="lx-link" to="/browse" data-rise>Open the feed <span aria-hidden="true">→</span></Link>
    </>
  );
  if (i === 1) return (
    <>
      {head}
      <p className="ch-lede" data-rise>A resume-aware 0–100 score that explains itself, and an AI agent that reads any event’s own site and answers your questions with sources.</p>
      <dl className="ch-facts" data-rise>
        <div><dt>Fit score</dt><dd>Every listing scored 0–100 against your resume, with the reasons in plain English.</dd></div>
        <div><dt>Event agent</dt><dd>Reads the organiser’s own pages and cites them in every answer.</dd></div>
      </dl>
      <Link className="lx-link" to="/for-you" data-rise>Get matched <span aria-hidden="true">→</span></Link>
    </>
  );
  return (
    <>
      {head}
      <p className="ch-lede" data-rise>Connect with builders, form a team with a private room and live chat, and keep every deadline in your own calendar.</p>
      <dl className="ch-facts" data-rise>
        <div><dt>Network</dt><dd>Find builders who fit your team and connect.</dd></div>
        <div><dt>Team rooms</dt><dd>A private room with live chat for every team you form.</dd></div>
        <div><dt>Calendar</dt><dd>Every deadline you save, in the calendar you already use.</dd></div>
      </dl>
      <Link className="lx-link" to="/network" data-rise>Find teammates <span aria-hidden="true">→</span></Link>
    </>
  );
}

export default function Exhibition({ stats, still }) {
  const wide = useWide();
  const shared = wide && !still; // desktop with motion: one sticky image wall, chapters scroll past it
  const root = useRef(null);
  const prog = useRef([0, 0, 0]);
  const drivers = useRef([]);
  const active = useRef([false, false, false]);
  // scroll triggers can report a plate visible before its WebGL driver exists; replay the state on arrival
  const onDriver = (i, d) => { drivers.current[i] = d; d?.setVisible(active.current[i]); };

  useLayoutEffect(() => {
    if (still) return undefined;
    const el = root.current;
    const arts = [...el.querySelectorAll('.ch')];
    const plates = [...el.querySelectorAll('.ex-plate')];
    const ctx = gsap.context(() => {
      // chapter copy: the title rises out of its mask, the rest follows, once
      arts.forEach((a) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: a, start: 'top 78%', once: true } });
        tl.fromTo(a.querySelector('.ch-tl'), { yPercent: 108 }, { yPercent: 0, duration: 1.15, ease: 'expo.out' })
          .fromTo(a.querySelectorAll('.ch-k, [data-rise]'), { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out' }, 0.12);
      });
      // camera progress: how far through each chapter the visitor is
      arts.forEach((a, i) => {
        ScrollTrigger.create({ trigger: shared ? a : plates[i], start: 'top bottom', end: 'bottom top', onUpdate: (s) => { prog.current[i] = s.progress; } });
      });
      if (shared) {
        // scene changes: the next photograph wipes up over the last, settling from a slight scale; the last recedes
        for (let i = 1; i < plates.length; i++) {
          const st = { trigger: arts[i], start: 'top 75%', end: 'top 15%', scrub: 0.6 };
          gsap.timeline({ scrollTrigger: st })
            .fromTo(plates[i], { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none' }, 0)
            .fromTo(plates[i].firstChild, { scale: 1.12 }, { scale: 1, ease: 'none' }, 0)
            .fromTo(plates[i - 1].firstChild, { scale: 1, opacity: 1 }, { scale: 0.96, opacity: 0.25, ease: 'none' }, 0);
        }
        // only the photographs you can see are drawn
        plates.forEach((_, i) => {
          ScrollTrigger.create({
            trigger: i === 0 ? el : arts[i], start: i === 0 ? 'top bottom' : 'top 75%',
            endTrigger: i === plates.length - 1 ? el : arts[i + 1], end: i === plates.length - 1 ? 'bottom top' : 'top 15%',
            onToggle: (s) => { active.current[i] = s.isActive; drivers.current[i]?.setVisible(s.isActive); },
          });
        });
      } else {
        // stacked: each photograph opens as it arrives
        plates.forEach((p) => {
          gsap.fromTo(p, { clipPath: 'inset(12% 6% 12% 6%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'top 45%', scrub: 0.6 } });
        });
      }
    }, el);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [shared, still]);

  return (
    <section className={`ex ${shared ? 'is-shared' : 'is-stacked'}${still ? ' is-still' : ''}`} ref={root} aria-label="What HackElite does">
      {shared && (
        <div className="ex-wall">
          {CHAPTERS.map((ch, i) => <Plate key={ch.key} ch={ch} i={i} still={still} prog={prog} manual onDriver={onDriver} />)}
        </div>
      )}
      <div className="ex-copy">
        {CHAPTERS.map((ch, i) => (
          <article key={ch.key} className={`ch ch-${ch.key}`} aria-labelledby={`ch-${ch.key}`}>
            {!shared && <Plate ch={ch} i={i} still={still} prog={prog} />}
            <div className="ch-body"><Copy i={i} stats={stats} /></div>
          </article>
        ))}
      </div>
    </section>
  );
}
