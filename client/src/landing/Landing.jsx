import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigationType } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { reducedMotion } from '../ui.jsx';
import { useTheme } from '../useTheme.js';
import { supportsWebGL2 } from './DepthScene.js';
import Hero from './Hero.jsx';
import Exhibition from './Exhibition.jsx';
import HallFooter from './HallFooter.jsx';
import './experience.css';

gsap.registerPlugin(ScrollTrigger);

let introPlayed = false; // the entrance plays once per page load (a refresh is a new load; in-app returns are not)
const SCROLL_KEY = 'lx-scroll';

function Nav({ user }) {
  const [theme, flip] = useTheme();
  const [to, label] = !user ? ['/login', 'Sign in']
    : user.role === 'admin' ? ['/admin', 'Admin']
      : user.role === 'lister' ? ['/lister', 'My events'] : ['/for-you', 'For you'];
  return (
    <header className="lx-nav">
      <Link to="/" className="lx-brand" data-intro="nav" aria-label="HackElite home">Hack<span>Elite</span></Link>
      <nav className="lx-menu" aria-label="Main">
        <Link to="/browse" data-intro="nav">Explore</Link>
        <Link to={to} data-intro="nav">{label}</Link>
        <button type="button" className="lx-theme" data-intro="nav" onClick={flip} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}><i aria-hidden="true" /></button>
      </nav>
    </header>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const root = useRef(null);
  const navType = useNavigationType();
  // Reduced motion, or no WebGL2: the same composition as stills, no scroll choreography.
  const [still] = useState(() => reducedMotion() || !supportsWebGL2());

  useEffect(() => {
    let live = true;
    api.stats().then((s) => live && setStats(s)).catch(() => {});
    return () => { live = false; };
  }, []);

  // Arriving by link starts the film at the beginning. Refresh and back/forward return to where the visitor was:
  // the browser cannot do that itself because the page is short until this chunk renders. The restored frame is
  // shown at once (scrub smoothing completed) rather than fast-forwarding through the film.
  useLayoutEffect(() => {
    const h = window.history;
    const prev = h.scrollRestoration;
    try { h.scrollRestoration = 'manual'; } catch { /* unsupported */ }
    let saved = 0;
    try { saved = Number(sessionStorage.getItem(SCROLL_KEY)) || 0; } catch { /* storage blocked */ }
    window.scrollTo(0, navType === 'PUSH' ? 0 : saved);
    if (window.scrollY > 0) {
      ScrollTrigger.update();
      ScrollTrigger.getAll().forEach((st) => {
        if (!st.vars.scrub || !st.animation) return;
        const tw = st.getTween?.();
        if (tw && typeof tw.progress === 'function') tw.progress(1);
        st.animation.progress(st.progress);
      });
    }
    let y = window.scrollY;
    const track = () => { y = window.scrollY; };
    const save = () => { try { sessionStorage.setItem(SCROLL_KEY, String(Math.round(y))); } catch { /* storage blocked */ } };
    window.addEventListener('scroll', track, { passive: true });
    window.addEventListener('pagehide', save);
    return () => {
      save();
      window.removeEventListener('scroll', track);
      window.removeEventListener('pagehide', save);
      try { h.scrollRestoration = prev; } catch { /* unsupported */ }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Entrance: nav, then the wordmark rising out of its mask, then the supporting lines. Waits for the font and
  // the hero photograph (at most 900 ms) so nothing flashes in a fallback face or over an empty frame.
  useLayoutEffect(() => {
    const el = root.current;
    if (introPlayed || reducedMotion()) return undefined;
    let cancelled = false;
    const ctx = gsap.context(() => {
      const navItems = el.querySelectorAll('[data-intro="nav"]');
      const words = el.querySelectorAll('[data-intro="word"]');
      const support = el.querySelectorAll('[data-intro="support"]');
      const frame = el.querySelector('[data-intro="frame"]');
      gsap.set(navItems, { autoAlpha: 0, y: -8 });
      gsap.set(words, { yPercent: 112 });
      gsap.set(support, { autoAlpha: 0, y: 10 });
      gsap.set(frame, { autoAlpha: 0, scale: 1.035 });
      const tl = gsap.timeline({ paused: true, onComplete: () => { introPlayed = true; } })
        .to(frame, { autoAlpha: 1, scale: 1, duration: 1.3, ease: 'power3.out' }, 0)
        .to(navItems, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out' }, 0.1)
        .to(words, { yPercent: 0, duration: 1, stagger: 0.09, ease: 'expo.out' }, 0.25)
        .to(support, { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.08, ease: 'power3.out' }, 0.45);
      const poster = el.querySelector('.hx-poster');
      const ready = Promise.all([document.fonts?.ready, poster?.decode?.().catch(() => {})]);
      Promise.race([ready, new Promise((r) => setTimeout(r, 900))]).then(() => { if (!cancelled) tl.play(); });
    }, el);
    return () => { cancelled = true; ctx.revert(); };
  }, []);

  // Late layout changes (fonts, live data, images) move trigger positions: re-measure, debounced.
  useEffect(() => {
    if (still) return undefined;
    let t;
    const later = () => { clearTimeout(t); t = setTimeout(() => ScrollTrigger.refresh(), 160); };
    const ro = new ResizeObserver(later);
    ro.observe(root.current);
    document.fonts?.ready.then(later);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, [still]);

  return (
    <div className={`lx${still ? ' is-still' : ''}`} ref={root}>
      <Nav user={user} />
      <Hero stats={stats} user={user} still={still} />
      <Exhibition stats={stats} still={still} />
      <HallFooter user={user} still={still} />
    </div>
  );
}
