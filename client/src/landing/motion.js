// Small, allocation-free motion utilities shared by the landing scenes.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
// Frame-rate independent exponential approach: the same feel at 30, 60 or 120 Hz.
export const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));

/**
 * A keyframed camera track. `keys` is [[t, {name: value, ...}], ...] with t ascending in 0..1.
 * Each channel is a monotone cubic (Fritsch-Carlson): velocity is continuous across keyframes, so scene
 * boundaries never jerk, and values never overshoot a hold. Evaluation is a pure function of t, so the same
 * scroll position always gives the same frame, forwards or backwards.
 */
export function track(keys) {
  const ts = keys.map((k) => k[0]);
  const names = Object.keys(keys[0][1]);
  const ch = names.map((n) => {
    const v = keys.map((k) => k[1][n] ?? keys[0][1][n]);
    const d = ts.slice(0, -1).map((t, i) => (v[i + 1] - v[i]) / (ts[i + 1] - t)); // secants
    const m = v.map((_, i) => (i === 0 || i === v.length - 1 ? 0 : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
    for (let i = 0; i < d.length; i++) { // limit tangents so each segment stays monotone
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
      if (h > 9) { const s = 3 / Math.sqrt(h); m[i] = s * a * d[i]; m[i + 1] = s * b * d[i]; }
    }
    return { n, v, m };
  });
  return function at(t, out) {
    t = clamp(t, ts[0], ts[ts.length - 1]);
    let i = 0;
    while (i < ts.length - 2 && t > ts[i + 1]) i++;
    const h = ts[i + 1] - ts[i], s = h ? (t - ts[i]) / h : 0;
    const s2 = s * s, s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    for (const c of ch) out[c.n] = h00 * c.v[i] + h10 * h * c.m[i] + h01 * c.v[i + 1] + h11 * h * c.m[i + 1];
    return out;
  };
}

// Reads a CSS colour token (e.g. --accent) as linear-ish 0..1 RGB for the shader. Works for #hex and rgb().
export function cssColor(name, el = document.documentElement) {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const probe = document.createElement('span');
  probe.style.color = raw; probe.style.display = 'none';
  document.body.appendChild(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0];
  probe.remove();
  return [m[0] / 255, m[1] / 255, m[2] / 255];
}

// Runs `fn` whenever the theme attribute on <html> changes. Returns the unsubscribe function.
export function onThemeChange(fn) {
  const mo = new MutationObserver(fn);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}

export const canHover = () => typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
