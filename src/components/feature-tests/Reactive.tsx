/** @jsxImportSource solid-js */
import { createSignal } from 'solid-js';

declare global {
  interface Window { __ftRenders?: number }
}

export default function Reactive() {
  // A Solid component body runs once; signal updates patch only the bound text node.
  if (typeof window !== 'undefined') window.__ftRenders = (window.__ftRenders ?? 0) + 1;
  const [count, setCount] = createSignal(0);
  return (
    <div>
      <button id="ft-inc" type="button" onClick={() => setCount(count() + 1)}>Increment</button>
      <p>Count: <span id="ft-count">{count()}</span></p>
    </div>
  );
}
