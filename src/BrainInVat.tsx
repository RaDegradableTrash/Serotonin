import { useEffect, useRef, useState } from 'react';
import './BrainInVat.css';
import { navigateTerminal } from './terminalNavigation';
export default function BrainInVat() {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);
  return <main className="vat-page" data-leaving={leaving} aria-label="缸中之脑"><a className="vat-back" href="/terminal" onClick={event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (timer.current !== null) return;
    setLeaving(true);
    timer.current = setTimeout(() => navigateTerminal('/terminal', true),
      matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 360);
  }}><span aria-hidden="true">←</span> 返回</a></main>;
}
