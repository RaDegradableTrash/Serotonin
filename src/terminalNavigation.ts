// Keep the blue transition on screen while the next route loads.
export function navigateTerminal(path: string) {
  const target = new URL(path, location.href);
  if (target.origin !== location.origin) { location.assign(target.href); return; }
  history.pushState(null, '', target.pathname + target.search + target.hash);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
