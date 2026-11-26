#!/usr/bin/env python3
"""Builds the landing page's photo assets in client/public/landing/ from the four source photographs.

    python3 scripts/landing-assets.py <photo-dir> <depth-model.onnx>

<photo-dir> holds the four Unsplash originals (file names below). <depth-model.onnx> is Depth Anything V2 Small,
exported to ONNX with a fixed 1x3x518x518 input, from
https://github.com/fabio-sim/Depth-Anything-ONNX/releases/download/v2.0.0/depth_anything_v2_vits.onnx
Needs: pip install onnxruntime numpy pillow (Pillow with AVIF support, 11.3+).

For every photo it writes:
  <name>.jpg   the original file, byte for byte (fallback, and the master the others derive from)
  <name>.avif  / <name>.webp  the same pixels at full resolution, high quality
  <name>-depth.png  a smoothed monocular depth map (white = near), for the WebGL camera's parallax
and for the hall only:
  hall-glow.png  R = warm bulb bloom, G = green stage-light bloom (drives the light-up and the cursor glow)

Nothing here generates or alters image content: the photo pixels are re-encoded, never upscaled or retouched.
If you have larger originals (Unsplash "Original size"), drop them in and re-run for sharper close framing.
"""
import os
import shutil
import sys

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter

PHOTOS = {
    'hall': 'mirea-mazzei-d1Lp7juy6JU-unsplash.jpg',
    'tabs': 'bharath-kumar-8IoNCI3K0AQ-unsplash.jpg',
    'night': 'tai-bui-HzVBe-8frwc-unsplash.jpg',
    'team': 'tommao-wang-Ds5FesTkKhk-unsplash.jpg',
}
N = 518  # the model's fixed input size
MEAN = np.array([0.485, 0.456, 0.406], np.float32)
STD = np.array([0.229, 0.224, 0.225], np.float32)


def resize(a, w, h):
    return np.asarray(Image.fromarray(a).resize((w, h), Image.BICUBIC), np.float32)


def depth_map(sess, im):
    """Relative depth (white = near): one global pass for layout, plus overlapping 518px tiles of a 2x working
    image for edge detail, each tile least-squares aligned to the global pass before feathered blending."""
    name = sess.get_inputs()[0].name

    def infer(arr):
        x = Image.fromarray((arr * 255).astype(np.uint8)).resize((N, N), Image.BICUBIC)
        x = ((np.asarray(x, np.float32) / 255.0 - MEAN) / STD).transpose(2, 0, 1)[None]
        return np.squeeze(sess.run(None, {name: x})[0]).astype(np.float32)

    W, H = im.size
    g = resize(infer(np.asarray(im, np.float32) / 255.0), W, H)
    s = 2 * N / min(W, H)
    w2, h2 = round(W * s), round(H * s)
    work = np.asarray(im.resize((w2, h2), Image.BICUBIC), np.float32) / 255.0
    gw = resize(g, w2, h2)
    acc = np.zeros((h2, w2), np.float32)
    wsum = np.zeros((h2, w2), np.float32)
    ramp = np.clip(np.minimum(np.linspace(0, 1, N), np.linspace(1, 0, N)) * 4, 0.02, 1)
    feather = np.outer(ramp, ramp).astype(np.float32)
    xs = list(range(0, w2 - N + 1, N // 2))
    ys = list(range(0, h2 - N + 1, N // 2))
    if xs[-1] != w2 - N: xs.append(w2 - N)
    if ys[-1] != h2 - N: ys.append(h2 - N)
    for y in ys:
        for x in xs:
            t = infer(work[y:y + N, x:x + N])
            A = np.stack([t.ravel(), np.ones(t.size, np.float32)], 1)
            (a, b), *_ = np.linalg.lstsq(A, gw[y:y + N, x:x + N].ravel(), rcond=None)
            acc[y:y + N, x:x + N] += (a * t + b) * feather
            wsum[y:y + N, x:x + N] += feather
    d = 0.35 * g + 0.65 * resize(acc / np.maximum(wsum, 1e-6), W, H)
    lo, hi = np.percentile(d, 0.5), np.percentile(d, 99.5)
    return np.clip((d - lo) / (hi - lo + 1e-6), 0, 1)


def smooth_depth(d, width=1024):
    """Downsample and soften the depth so the displaced mesh bends gently around people instead of tearing."""
    h = round(width * d.shape[0] / d.shape[1])
    im = Image.fromarray((d * 255).astype(np.uint8)).resize((width, h), Image.LANCZOS)
    im = im.filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(2.2))
    return im


def glow_map(im, width=1000):
    """Bloom of the hall's own light sources: warm bulbs in R, green stage/rig lights in G."""
    a = np.asarray(im, np.float32) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1)
    bright = np.clip((mx - 0.58) / 0.36, 0, 1) ** 1.5
    warm = bright * np.clip((r - b - 0.18) / 0.3, 0, 1) * (r >= g * 0.9)
    green = bright * np.clip((g - np.maximum(r, b) - 0.06) / 0.25, 0, 1)
    h = round(width * im.size[1] / im.size[0])
    out = []
    for m in (warm, green):
        m8 = Image.fromarray((m * 255).astype(np.uint8)).resize((width, h), Image.BILINEAR)
        acc = np.zeros((h, width), np.float32)
        for radius, weight in ((1.5, 0.9), (5, 0.9), (14, 0.8), (36, 0.6)):
            acc += weight * np.asarray(m8.filter(ImageFilter.GaussianBlur(radius)), np.float32) / 255.0
        out.append(np.clip(acc / 1.6, 0, 1) ** 0.85)
    rgb = np.stack([out[0], out[1], np.zeros_like(out[0])], -1)
    return Image.fromarray((rgb * 255).astype(np.uint8), 'RGB')


def screen_glow(im, width=800):
    """Bloom of the night photo's screens (R channel); the page tints it toward --accent / --cyan."""
    a = np.asarray(im, np.float32) / 255.0
    m = np.clip((a.max(-1) - 0.22) / 0.5, 0, 1) ** 1.2
    h = round(width * im.size[1] / im.size[0])
    m8 = Image.fromarray((m * 255).astype(np.uint8)).resize((width, h), Image.BILINEAR)
    acc = np.zeros((h, width), np.float32)
    for radius, weight in ((6, 0.5), (22, 0.8), (60, 0.9)):
        acc += weight * np.asarray(m8.filter(ImageFilter.GaussianBlur(radius)), np.float32) / 255.0
    acc = np.clip(acc / 1.4, 0, 1)
    rgb = np.stack([acc, np.zeros_like(acc), np.zeros_like(acc)], -1)
    return Image.fromarray((rgb * 255).astype(np.uint8), 'RGB')


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, model = sys.argv[1], sys.argv[2]
    out = os.path.join(os.path.dirname(__file__), '..', 'client', 'public', 'landing')
    os.makedirs(out, exist_ok=True)
    sess = ort.InferenceSession(model, providers=['CPUExecutionProvider'])
    for key, fname in PHOTOS.items():
        path = os.path.join(src, fname)
        im = Image.open(path).convert('RGB')
        shutil.copyfile(path, os.path.join(out, f'{key}.jpg'))
        # Keep a modern encoding only when it is clearly smaller than the original: re-encoding a grainy photo
        # (the hall) at equal quality costs more bytes, and squeezing it further smooths the grain away.
        budget = os.path.getsize(path) * 0.8
        for ext, opts in (('avif', dict(quality=82, speed=2, subsampling='4:4:4')), ('webp', dict(quality=92, method=6))):
            dst = os.path.join(out, f'{key}.{ext}')
            im.save(dst, **opts)
            if os.path.getsize(dst) > budget:
                os.remove(dst)
        smooth_depth(depth_map(sess, im)).save(os.path.join(out, f'{key}-depth.png'), optimize=True)
        if key == 'hall':
            glow_map(im).save(os.path.join(out, 'hall-glow.png'), optimize=True)
        if key == 'night':
            screen_glow(im).save(os.path.join(out, 'night-glow.png'), optimize=True)
        print(f'{key}: {im.size[0]}x{im.size[1]}')


if __name__ == '__main__':
    main()
