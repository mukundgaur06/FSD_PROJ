import { useEffect, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { makePose } from './DepthScene.js';
import { mountScene, placePoster } from './stage.js';
import { canHover, clamp, damp } from './motion.js';
import { PHOTOS, url } from './assets.js';

const WARM = [1, 0.66, 0.3];
const GREEN = [0.18, 1, 0.6];
// Pointer -> camera. At this plate size the nearest tables travel about ±24px, the stage about ±12px.
const SHIFT_X = 0.012, SHIFT_Y = 0.007, YAW = 0.0105, PITCH = 0.006, TILT = 1.6; // TILT in degrees

// The same hall photograph as the hero, alive: the camera looks toward the pointer, near layers move more than
// far ones, and the bulbs nearest the pointer glow a little brighter. People are never moved independently.
export default function HallFooter({ user, still }) {
  const root = useRef(null), plate = useRef(null), inner = useRef(null), canvas = useRef(null), poster = useRef(null);

  useEffect(() => {
    if (still) return undefined;
    const section = root.current, box = plate.current, tilt = inner.current;
    const pose = makePose();
    Object.assign(pose, { k: 0.5, zoom: 1.06, fu: 0.55, fv: 0.5, exposure: 1, hiGain: 1.05 });
    pose.glowA = WARM.map((c) => c * 0.2); pose.glowB = GREEN.map((c) => c * 0.16); pose.cursorTint = WARM.slice();
    const tgt = { x: 0, y: 0, g: 0, u: 0.5, v: 0.5 }, cur = { ...tgt };
    const hover = canHover();
    let rect = null, touchAt = -1e9, ready = false, scene = null;

    const aim = (cx, cy) => {
      rect ||= box.getBoundingClientRect();
      tgt.x = clamp(((cx - rect.left) / rect.width) * 2 - 1, -1.2, 1.2);
      tgt.y = clamp(((cy - rect.top) / rect.height) * 2 - 1, -1.2, 1.2);
      if (scene) { const [u, v] = scene.uvAt(cx - rect.left, cy - rect.top, pose); tgt.u = u; tgt.v = v; }
      tgt.g = cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom ? 1 : 0.35;
    };
    const onMove = (e) => { if (e.pointerType !== 'mouse') touchAt = performance.now(); aim(e.clientX, e.clientY); };
    const onLeave = () => { tgt.x = 0; tgt.y = 0; tgt.g = 0; };
    const forget = () => { rect = null; };
    section.addEventListener('pointermove', onMove, { passive: true });
    section.addEventListener('pointerdown', onMove, { passive: true });
    section.addEventListener('pointerleave', onLeave, { passive: true });
    window.addEventListener('scroll', forget, { passive: true });
    window.addEventListener('resize', forget, { passive: true });

    const update = (dt, t, sc, dirty) => {
      scene = sc;
      // no hover (touch screens): a slow autonomous look around the room, paused briefly after a touch
      if (!hover && performance.now() - touchAt > 2600) {
        tgt.x = 0.6 * Math.sin(t * 0.23); tgt.y = 0.35 * Math.sin(t * 0.17 + 1.1); tgt.g = 0.4;
        tgt.u = 0.5 + 0.28 * Math.sin(t * 0.23); tgt.v = 0.34 + 0.05 * Math.sin(t * 0.17 + 1.1);
      }
      const before = cur.x + cur.y + cur.g + cur.u + cur.v;
      cur.x = damp(cur.x, tgt.x, 6, dt); cur.y = damp(cur.y, tgt.y, 6, dt);
      cur.g = damp(cur.g, tgt.g, 4, dt); cur.u = damp(cur.u, tgt.u, 9, dt); cur.v = damp(cur.v, tgt.v, 9, dt);
      const moving = Math.abs(cur.x + cur.y + cur.g + cur.u + cur.v - before) > 1e-5;
      if (!ready) { const c = canvas.current; placePoster(poster.current, { x: 0, y: 0, w: c.clientWidth, h: c.clientHeight }, 'hall', pose); }
      if (!sc || (!moving && !dirty)) return null; // settled: nothing to draw
      tilt.style.transform = `perspective(1800px) rotateY(${(cur.x * TILT).toFixed(3)}deg) rotateX(${(-cur.y * TILT * 0.6).toFixed(3)}deg)`;
      pose.x = cur.x * SHIFT_X; pose.y = -cur.y * SHIFT_Y;
      pose.yaw = -cur.x * YAW; pose.pitch = -cur.y * PITCH;
      pose.cursor[0] = cur.u; pose.cursor[1] = cur.v; pose.cursor[2] = 0.1; pose.cursor[3] = cur.g * 0.6;
      return pose;
    };
    const d = mountScene(canvas.current, 'hall', { observe: box, margin: '10% 0px', grid: 200, update, onReady: () => { ready = true; canvas.current.dataset.ready = ''; } });
    return () => {
      d.destroy();
      section.removeEventListener('pointermove', onMove);
      section.removeEventListener('pointerdown', onMove);
      section.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', forget);
      window.removeEventListener('resize', forget);
    };
  }, [still]);

  // the headline rises once when the finale arrives
  useLayoutEffect(() => {
    if (still) return undefined;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } });
      tl.fromTo('.hf-tl', { yPercent: 108 }, { yPercent: 0, duration: 1.2, stagger: 0.1, ease: 'expo.out' })
        .fromTo('[data-rise]', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.25)
        .fromTo(plate.current, { autoAlpha: 0, scale: 0.97 }, { autoAlpha: 1, scale: 1, duration: 1.4, ease: 'power3.out' }, 0);
    }, root);
    return () => ctx.revert();
  }, [still]);

  return (
    <footer className="hf" ref={root} aria-labelledby="hf-title">
      <div className="hf-grid">
        <div className="hf-copy">
          <h2 id="hf-title" className="hf-title">
            <span className="lx-mask"><span className="hf-tl">Find your</span></span>
            <span className="lx-mask"><span className="hf-tl">stage.</span></span>
          </h2>
          <p className="lx-k hf-sub" data-rise>Every open hackathon, ranked for you.</p>
          <div className="hf-cta" data-rise>
            <Link className="btn primary hf-btn" to="/browse">Enter HackElite <span aria-hidden="true">→</span></Link>
            <Link className="lx-link" to={user ? '/for-you' : '/register'}>{user ? 'See your matches' : 'Create a free account'} <span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <div className="hf-plate" ref={plate}>
          <div className="hf-plate-in" ref={inner}>
            <img ref={poster} src={url('hall.jpg')} alt={PHOTOS.hall.alt} width={PHOTOS.hall.w} height={PHOTOS.hall.h} loading="lazy" decoding="async" />
            <canvas ref={canvas} className="lx-gl" aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="hf-legal">
        <span>© {new Date().getFullYear()} HackElite. Listings link to the organiser, where you register.</span>
        <nav aria-label="Legal and data">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <a href="/api/listings/calendar.ics">Deadlines (.ics)</a>
          <a href="/api/listings">JSON API</a>
        </nav>
        <span className="hf-credit">Photographs: {['hall', 'tabs', 'night', 'team'].map((k) => PHOTOS[k].credit).join(', ')} on Unsplash</span>
      </div>
    </footer>
  );
}
