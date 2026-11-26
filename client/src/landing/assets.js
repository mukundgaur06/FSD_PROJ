// The four photographs and the maps derived from them (built by scripts/landing-assets.py into public/landing/).
// The hall ships only as its original JPEG: re-encoding its film grain as AVIF/WebP cost more bytes, not fewer.

const BASE = '/landing/';

export const PHOTOS = {
  hall: {
    formats: ['jpg'], w: 2000, h: 1333, depth: 'hall-depth.png', glow: 'hall-glow.png',
    alt: 'A hackathon hall seen from a balcony: rows of builders at long tables under strings of warm bulbs, a green-lit stage and a scaffolding staircase.',
    credit: 'Mirea Mazzei',
  },
  tabs: {
    formats: ['avif', 'webp', 'jpg'], w: 2000, h: 1424, depth: 'tabs-depth.png',
    alt: 'A soft 3D render of stacked pastel folder tabs, each labelled “vibe coding”, with a small Print{HELLO, WORLD} line.',
    credit: 'Bharath Kumar',
  },
  night: {
    formats: ['avif', 'webp', 'jpg'], w: 1333, h: 2000, depth: 'night-depth.png', glow: 'night-glow.png',
    alt: 'A dark room at night: a large monitor full of code and a laptop in front of it, glowing.',
    credit: 'Tai Bui',
  },
  team: {
    formats: ['avif', 'webp', 'jpg'], w: 1333, h: 2000, depth: 'team-depth.png',
    alt: 'A busy office: people working at rows of desks and monitors.',
    credit: 'Tommao Wang',
  },
};

export const url = (file) => BASE + file;

// <source> list for <picture>, best format first.
export const sources = (key) => PHOTOS[key].formats.filter((f) => f !== 'jpg').map((f) => ({ type: `image/${f}`, srcSet: url(`${key}.${f}`) }));

// Tiny probes (1x1) so the WebGL texture uses the same file the <picture> element picked: one download, cached.
const PROBES = {
  avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAKAAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAQAAAAEAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAMG1kYXQSAAoIGAAGiAhoNCAyGhlHh4Yhh5555oAAAJBAyRxhSytNj1FFTqSg',
  webp: 'data:image/webp;base64,UklGRhwAAABXRUJQVlA4TA8AAAAvAAAAAAcQ/Y/+ByKi/wEA',
};
const support = {};
const probe = (f) => (support[f] ??= new Promise((ok) => {
  const i = new Image();
  i.onload = () => ok(i.width === 1); i.onerror = () => ok(false);
  i.src = PROBES[f];
}));

export async function photoUrl(key) {
  for (const f of PHOTOS[key].formats) {
    if (f === 'jpg' || (await probe(f))) return url(`${key}.${f}`);
  }
  return url(`${key}.jpg`);
}
