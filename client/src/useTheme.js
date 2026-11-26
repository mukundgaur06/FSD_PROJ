import { useEffect, useState } from 'react';

// The theme lives on <html data-theme>. Every toggle reads and writes it there, and each one follows changes made
// elsewhere (the landing page has its own toggle), so their icons never go stale.
const read = () => document.documentElement.dataset.theme || 'dark';

export function useTheme() {
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setTheme(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  const flip = () => {
    const next = read() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* storage blocked: the choice lasts for this page */ }
  };
  return [theme, flip];
}
