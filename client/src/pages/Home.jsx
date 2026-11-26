import { lazy, Suspense, useLayoutEffect } from 'react';
import './landing.css';

// The landing experience (GSAP, WebGL, the photographs) is its own chunk, so no other page downloads any of it.
const Landing = lazy(() => import('../landing/Landing.jsx'));

// Start fetching the hero photograph while the landing code is still on its way.
function preloadHero() {
  if (document.head.querySelector('link[data-ld-hero]')) return;
  const l = document.createElement('link');
  l.rel = 'preload'; l.as = 'image'; l.href = '/landing/hall.jpg'; l.fetchPriority = 'high'; l.dataset.ldHero = '';
  document.head.appendChild(l);
}

export default function Home() {
  // The landing page brings its own minimal navigation and footer; the app's header and footer step aside.
  useLayoutEffect(() => {
    preloadHero();
    const html = document.documentElement;
    html.classList.add('ld-route');
    return () => html.classList.remove('ld-route');
  }, []);
  return (
    <Suspense fallback={<div className="ld-wait" />}>
      <Landing />
    </Suspense>
  );
}
