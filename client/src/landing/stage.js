import gsap from 'gsap';
import { DepthScene, framing } from './DepthScene.js';
import { PHOTOS, photoUrl, url } from './assets.js';

/**
 * Owns one WebGL photo scene: creates it when its section nears the viewport, keeps the backing store sized,
 * and calls `update(dt, time, scene)` on GSAP's single ticker only while the section is visible (no competing
 * rAF loops, no work off screen). `update` returns the pose to draw this frame, or null to skip drawing.
 */
export function mountScene(canvas, key, { observe = canvas, margin = '20% 0px', grid = 180, update, onReady, onError }) {
  const meta = PHOTOS[key];
  let scene = null, started = false, dead = false, visible = false, on = false;
  let dirty = true;

  const start = async () => {
    if (started) return;
    started = true;
    try {
      const s = new DepthScene(canvas, { image: await photoUrl(key), depth: url(meta.depth), glow: meta.glow && url(meta.glow), grid });
      await s.init();
      if (dead) { s.destroy(); return; }
      scene = s; dirty = true;
      onReady?.(s);
    } catch (e) {
      if (!dead) onError?.(e);
    }
  };

  const tick = (time, deltaMs) => {
    const pose = update(Math.min(deltaMs, 100) / 1000, time, scene, dirty);
    if (scene && pose) { scene.render(pose); dirty = false; }
  };
  const sync = () => {
    if (visible && !on) { gsap.ticker.add(tick); on = true; dirty = true; }
    else if (!visible && on) { gsap.ticker.remove(tick); on = false; }
  };
  // observe = an element: draw while it is on screen. observe = null: the caller decides, via setVisible().
  const io = observe ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); sync(); }, { rootMargin: margin }) : null;
  io?.observe(observe);
  const ro = new ResizeObserver(() => { scene?.resize(); dirty = true; });
  ro.observe(canvas);

  return {
    get scene() { return scene; },
    invalidate() { dirty = true; },
    setVisible(v) { visible = v; if (v) start(); sync(); },
    destroy() {
      dead = true;
      io?.disconnect(); ro.disconnect();
      if (on) gsap.ticker.remove(tick);
      scene?.destroy();
    },
  };
}

// Positions the plain <img> poster exactly where the WebGL camera will show the photo at the same pose, so the
// first WebGL frame lands on top of it without a jump.
export function placePoster(img, frame, key, pose) {
  const { w: iw, h: ih } = PHOTOS[key];
  const ia = iw / ih;
  const m = framing(frame.w / frame.h, ia, pose.zoom, pose.fu, pose.fv);
  const h = m.z * frame.h, w = h * ia;
  const cx = frame.x + frame.w / 2 + (m.sx * frame.w) / 2, cy = frame.y + frame.h / 2 - (m.sy * frame.h) / 2;
  const s = img.style;
  s.width = `${w}px`; s.height = `${h}px`; s.left = `${cx - w / 2}px`; s.top = `${cy - h / 2}px`;
}
