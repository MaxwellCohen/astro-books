/** @jsxImportSource solid-js */
import { createSignal } from 'solid-js';

export default function Counter() {
  const [count, setCount] = createSignal(0);
  return (
    <button id="ft-island" type="button" onClick={() => setCount(count() + 1)}>
      Island clicks: {count()}
    </button>
  );
}
