import './BrainInVat.css';
import { navigateTerminal } from './terminalNavigation';
export default function BrainInVat() {
  return <main className="vat-page" aria-label="缸中之脑"><a className="vat-back" href="/terminal" onClick={event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigateTerminal('/terminal');
  }}><span aria-hidden="true">←</span> 返回</a></main>;
}
