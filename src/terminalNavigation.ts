// Keep the blue transition on screen while the next route loads.
export function navigateTerminal(path: string, revealTerminal = false, revealFrom = '/brain_in_vat') {
  const target = new URL(path, location.href);
  if (target.origin !== location.origin) { location.assign(target.href); return; }
  history.pushState({ revealTerminal, revealFrom }, '', target.pathname + target.search + target.hash);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
