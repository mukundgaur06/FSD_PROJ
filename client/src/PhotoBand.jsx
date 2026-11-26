import { sources, url } from './landing/assets.js';

// A wide band of one of the landing page's photographs that opens a section of the app and fades into the page.
// The page title sits over its faded lower edge. Decorative: the section's heading carries the meaning.
export default function PhotoBand({ photo, focus = '50% 50%' }) {
  return (
    <div className="pb" aria-hidden="true">
      <picture>
        {sources(photo).map((s) => <source key={s.type} type={s.type} srcSet={s.srcSet} />)}
        <img src={url(`${photo}.jpg`)} alt="" decoding="async" style={{ objectPosition: focus }} />
      </picture>
    </div>
  );
}
