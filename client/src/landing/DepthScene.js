// DepthScene: one photograph rendered as a depth-displaced mesh, seen through a real perspective camera.
//
// Every vertex sits on the ray through its own pixel, pulled toward the camera by the photo's depth map. From the
// reference viewpoint the photograph is therefore reproduced exactly, pixel for pixel; once the camera moves, near
// things (tables, the staircase) shift more than far ones (the stage, the back wall): real parallax, not a 2D zoom.
// Faces and bodies are never retouched or regenerated: the only changes are camera position and added light.
//
// Raw WebGL2, no library: one mesh, one draw call. The photo is sampled with a 5-tap Catmull-Rom filter when
// magnified (sharper than bilinear) and with trilinear + anisotropic mipmaps when minified.

const VERT = `#version 300 es
in vec2 aPlane;   // point on the reference image plane (z = -1)
in float aNear;   // 0 = far, 1 = near (from the depth map)
in vec2 aUv;
uniform mat4 uMVP;
uniform float uK; // how strongly depth pulls vertices toward the camera
out vec2 vUv;
void main() {
  vUv = aUv;
  float s = 1.0 - uK * aNear;
  gl_Position = uMVP * vec4(aPlane * s, -s, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uImage;
uniform sampler2D uGlow;
uniform vec2 uTex;        // photo size in texels
uniform float uExposure;  // global light level (1 = as photographed)
uniform float uHiGain;    // gain on the photo's own bright lights (bulbs, screens)
uniform vec3 uGlowA;      // tint * amount for the glow map's R channel
uniform vec3 uGlowB;      // tint * amount for the glow map's G channel
uniform vec4 uCursor;     // u, v, radius, amount: extra glow on lights near the pointer
uniform vec3 uCursorTint;
uniform float uAspect;
out vec4 outColor;

vec3 catmullRom(vec2 uv) {
  vec2 p = uv * uTex;
  vec2 t1 = floor(p - 0.5) + 0.5;
  vec2 f = p - t1;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 t0 = (t1 - 1.0) / uTex;
  vec2 t3 = (t1 + 2.0) / uTex;
  vec2 t12 = (t1 + w2 / w12) / uTex;
  vec3 c = textureLod(uImage, vec2(t12.x, t0.y), 0.0).rgb * (w12.x * w0.y)
         + textureLod(uImage, vec2(t0.x, t12.y), 0.0).rgb * (w0.x * w12.y)
         + textureLod(uImage, t12, 0.0).rgb * (w12.x * w12.y)
         + textureLod(uImage, vec2(t3.x, t12.y), 0.0).rgb * (w3.x * w12.y)
         + textureLod(uImage, vec2(t12.x, t3.y), 0.0).rgb * (w12.x * w3.y);
  float w = w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y;
  return clamp(c / w, 0.0, 1.0);
}

void main() {
  vec2 uv = clamp(vUv, 0.0, 1.0);
  vec2 px = uv * uTex;
  float lod = log2(max(max(length(dFdx(px)), length(dFdy(px))), 1e-6));
  // minified: trilinear alone lands on a mip coarser than the screen (soft); a small negative bias keeps the
  // photo as crisp as the browser's own image scaling, and anisotropic filtering keeps it free of shimmer
  vec3 mip = texture(uImage, uv, -0.6).rgb;
  vec3 c = lod < 0.5 ? mix(catmullRom(uv), mip, smoothstep(0.0, 0.5, lod)) : mip;

  float hi = smoothstep(0.55, 0.95, max(c.r, max(c.g, c.b)));
  c *= uExposure * mix(1.0, uHiGain, hi);

  vec2 g = texture(uGlow, uv).rg;
  vec2 d = (uv - uCursor.xy) * vec2(uAspect, 1.0);
  float near = exp(-dot(d, d) / (uCursor.z * uCursor.z)) * uCursor.w;
  vec3 light = g.r * uGlowA + g.g * uGlowB + g.r * near * uCursorTint;
  c = 1.0 - (1.0 - c) * (1.0 - clamp(light, 0.0, 1.0)); // screen blend: light never clips to flat white
  outColor = vec4(c, 1.0);
}`;

// ---- tiny matrix helpers (column-major, like WebGL) ----
function perspective(out, f, aspect, near, far, sx, sy) {
  out.fill(0);
  out[0] = f / aspect; out[5] = f;
  out[8] = -sx; out[9] = -sy; // lens shift: moves the framing without moving the camera (no parallax)
  out[10] = (far + near) / (near - far); out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}
// view = (T(c) * Ry(yaw) * Rx(pitch))^-1
function view(out, x, y, z, yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  // camera basis vectors (rows of the inverse rotation)
  const r0 = [cy, 0, -sy], r1 = [sy * sp, cp, cy * sp], r2 = [sy * cp, -sp, cy * cp];
  out[0] = r0[0]; out[4] = r0[1]; out[8] = r0[2];
  out[1] = r1[0]; out[5] = r1[1]; out[9] = r1[2];
  out[2] = r2[0]; out[6] = r2[1]; out[10] = r2[2];
  out[3] = 0; out[7] = 0; out[11] = 0; out[15] = 1;
  out[12] = -(r0[0] * x + r0[1] * y + r0[2] * z);
  out[13] = -(r1[0] * x + r1[1] * y + r1[2] * z);
  out[14] = -(r2[0] * x + r2[1] * y + r2[2] * z);
  return out;
}
function mul(out, a, b) {
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  return out;
}

// Framing maths shared with the DOM poster image. A frame of aspect `fa` shows an image of aspect `ia` "covered"
// (no empty edges) at zoom 1; `fu`/`fv` is the image point to centre, clamped so the frame never leaves the photo.
export function framing(fa, ia, zoom, fu, fv) {
  const z = zoom * Math.max(1, fa / ia);
  const hx = (z * ia) / fa; const hy = z; // image half-extent in NDC
  const sx = clampAbs(-(2 * z * (fu - 0.5) * ia) / fa, hx - 1);
  const sy = clampAbs(-(2 * z * (0.5 - fv)), hy - 1);
  return { z, sx, sy, hx, hy };
}
const clampAbs = (v, m) => Math.max(-Math.max(m, 0), Math.min(Math.max(m, 0), v));

export const supportsWebGL2 = () => {
  try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch { return false; }
};

export function loadImage(src) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  return img.decode().then(() => img);
}

// A neutral pose. Callers keep one object per scene and mutate it each frame (no per-frame allocation).
export const makePose = () => ({
  x: 0, y: 0, z: 0, yaw: 0, pitch: 0, zoom: 1.04, fu: 0.5, fv: 0.5, k: 0.4,
  exposure: 1, hiGain: 1, glowA: [0, 0, 0], glowB: [0, 0, 0], cursor: [0.5, 0.5, 0.2, 0], cursorTint: [0, 0, 0],
});

export class DepthScene {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{image: string, depth: string, glow?: string, grid?: number, maxDpr?: number}} opts
   */
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.opts = { grid: 200, maxDpr: 2, ...opts };
    this.quality = 1; // adaptive resolution multiplier (drops if frames are slow)
    this.mvp = new Float32Array(16); this.proj = new Float32Array(16); this.view = new Float32Array(16);
    this.frame = null; // {x, y, w, h} in CSS px inside the canvas; null = whole canvas
    this.ready = false;
    this.slow = 0; this.lastT = 0;
    this.onLost = (e) => { e.preventDefault(); this.ready = false; };
    this.onRestored = () => { this.init().catch(() => {}); };
    canvas.addEventListener('webglcontextlost', this.onLost);
    canvas.addEventListener('webglcontextrestored', this.onRestored);
  }

  async init() {
    const { image, depth, glow } = this.opts;
    const [img, dep, glw] = await Promise.all([loadImage(image), loadImage(depth), glow ? loadImage(glow) : null]);
    if (this.destroyed) return;
    const gl = this.canvas.getContext('webgl2', { alpha: true, antialias: false, depth: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    this.aspect = img.naturalWidth / img.naturalHeight;
    this.texSize = [img.naturalWidth, img.naturalHeight];
    this.program = this.link(VERT, FRAG);
    this.buildMesh(dep);
    this.imageTex = this.texture(img, true);
    this.glowTex = glw ? this.texture(glw, false) : this.blank();
    this.u = {};
    for (const n of ['uMVP', 'uK', 'uImage', 'uGlow', 'uTex', 'uExposure', 'uHiGain', 'uGlowA', 'uGlowB', 'uCursor', 'uCursorTint', 'uAspect']) {
      this.u[n] = gl.getUniformLocation(this.program, n);
    }
    gl.enable(gl.DEPTH_TEST);
    this.resize();
    this.ready = true;
  }

  link(vs, fs) {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  texture(img, mips) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (mips) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      const an = gl.getExtension('EXT_texture_filter_anisotropic');
      if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    return t;
  }

  blank() {
    const gl = this.gl; const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    return t;
  }

  // Grid over the photo plus a small skirt beyond its edges (clamped texture), so an extreme camera position
  // smears the outermost pixels instead of showing a hole.
  buildMesh(depthImg) {
    const gl = this.gl;
    const dw = depthImg.naturalWidth, dh = depthImg.naturalHeight;
    const c = document.createElement('canvas'); c.width = dw; c.height = dh;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(depthImg, 0, 0);
    const px = ctx.getImageData(0, 0, dw, dh).data;
    const sample = (u, v) => { // bilinear, clamped
      const x = Math.min(Math.max(u, 0), 1) * (dw - 1), y = Math.min(Math.max(v, 0), 1) * (dh - 1);
      const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(x0 + 1, dw - 1), y1 = Math.min(y0 + 1, dh - 1);
      const fx = x - x0, fy = y - y0;
      const at = (xx, yy) => px[(yy * dw + xx) * 4] / 255;
      return (at(x0, y0) * (1 - fx) + at(x1, y0) * fx) * (1 - fy) + (at(x0, y1) * (1 - fx) + at(x1, y1) * fx) * fy;
    };
    this.depthAt = sample;
    const A = this.aspect, skirt = 0.06;
    const gx = this.opts.grid, gy = Math.max(8, Math.round(gx / A));
    const n = (gx + 1) * (gy + 1);
    const plane = new Float32Array(n * 2), near = new Float32Array(n), uv = new Float32Array(n * 2);
    let i = 0;
    for (let y = 0; y <= gy; y++) {
      for (let x = 0; x <= gx; x++, i++) {
        const u = -skirt + (x / gx) * (1 + 2 * skirt), v = -skirt + (y / gy) * (1 + 2 * skirt);
        plane[i * 2] = (u - 0.5) * A; plane[i * 2 + 1] = 0.5 - v;
        uv[i * 2] = u; uv[i * 2 + 1] = v;
        near[i] = sample(u, v);
      }
    }
    const idx = new (n > 65535 ? Uint32Array : Uint16Array)(gx * gy * 6);
    let k = 0;
    for (let y = 0; y < gy; y++) for (let x = 0; x < gx; x++) {
      const a = y * (gx + 1) + x, b = a + 1, c2 = a + gx + 1, d = c2 + 1;
      idx[k++] = a; idx[k++] = c2; idx[k++] = b; idx[k++] = b; idx[k++] = c2; idx[k++] = d;
    }
    this.count = idx.length; this.indexType = n > 65535 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const attr = (name, data, size) => {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(this.program, name); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    attr('aPlane', plane, 2); attr('aNear', near, 1); attr('aUv', uv, 2);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  }

  // Backing store = CSS layout size x device pixel ratio (capped), times the adaptive quality factor. Layout size,
  // not getBoundingClientRect: an ancestor's transform (entrance scale, tilt) must not resize the drawing buffer.
  resize() {
    const r = { width: this.canvas.clientWidth, height: this.canvas.clientHeight };
    const dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDpr) * this.quality;
    let w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    const cap = 3840 * 2400; // never allocate more than ~9 MP per canvas
    if (w * h > cap) { const s = Math.sqrt(cap / (w * h)); w = Math.round(w * s); h = Math.round(h * s); }
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.cssW = r.width; this.cssH = r.height;
  }

  // Pointer position (CSS px inside the canvas) -> photo uv, ignoring parallax (close enough for a light falloff).
  uvAt(x, y, pose) {
    const f = this.frame || { x: 0, y: 0, w: this.cssW, h: this.cssH };
    const fa = f.w / f.h; const m = framing(fa, this.aspect, pose.zoom, pose.fu, pose.fv);
    const nx = ((x - f.x) / f.w) * 2 - 1, ny = 1 - ((y - f.y) / f.h) * 2;
    return [0.5 + ((nx - m.sx) * fa) / (2 * m.z * this.aspect), 0.5 - (ny - m.sy) / (2 * m.z)];
  }

  render(pose, now = performance.now()) {
    if (!this.ready || this.destroyed) return;
    const gl = this.gl;
    // adaptive resolution: if frames keep arriving slowly while we render continuously, shed pixels, one step at a
    // time, but never below one device pixel per CSS pixel (the photograph's sharpness comes first)
    const dt = now - this.lastT; this.lastT = now;
    if (dt > 0 && dt < 120) {
      this.slow = dt > 26 ? this.slow + 1 : Math.max(0, this.slow - 2);
      const floor = 1 / Math.min(window.devicePixelRatio || 1, this.opts.maxDpr);
      if (this.slow > 45 && this.quality * 0.8 >= floor) { this.quality *= 0.8; this.slow = 0; this.resize(); }
    }
    const W = this.canvas.width, H = this.canvas.height;
    const s = W / Math.max(this.cssW, 1);
    const f = this.frame || { x: 0, y: 0, w: this.cssW, h: this.cssH };
    const vx = Math.round(f.x * s), vy = Math.round(H - (f.y + f.h) * s), vw = Math.max(1, Math.round(f.w * s)), vh = Math.max(1, Math.round(f.h * s));

    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(vx, vy, vw, vh);
    gl.viewport(vx, vy, vw, vh);

    const fa = vw / vh;
    const m = framing(fa, this.aspect, pose.zoom, pose.fu, pose.fv);
    perspective(this.proj, 2 * m.z, fa, 0.01, 10, m.sx, m.sy);
    view(this.view, pose.x, pose.y, pose.z, pose.yaw, pose.pitch);
    mul(this.mvp, this.proj, this.view);

    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.u.uMVP, false, this.mvp);
    gl.uniform1f(this.u.uK, pose.k);
    gl.uniform2f(this.u.uTex, this.texSize[0], this.texSize[1]);
    gl.uniform1f(this.u.uExposure, pose.exposure);
    gl.uniform1f(this.u.uHiGain, pose.hiGain);
    gl.uniform3fv(this.u.uGlowA, pose.glowA);
    gl.uniform3fv(this.u.uGlowB, pose.glowB);
    gl.uniform4fv(this.u.uCursor, pose.cursor);
    gl.uniform3fv(this.u.uCursorTint, pose.cursorTint);
    gl.uniform1f(this.u.uAspect, this.aspect);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.imageTex); gl.uniform1i(this.u.uImage, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.glowTex); gl.uniform1i(this.u.uGlow, 1);
    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.count, this.indexType, 0);
    gl.bindVertexArray(null);
  }

  destroy() {
    this.destroyed = true; this.ready = false;
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    // free GPU memory now rather than waiting for GC (matters when navigating back and forth)
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
