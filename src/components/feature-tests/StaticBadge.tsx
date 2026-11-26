/** @jsxImportSource solid-js */
// Rendered on the server only (no client:* directive). Its code must never reach the browser.
const MARKER = 'FT_STATIC_ONLY_MARKER_9c41';

export default function StaticBadge() {
  return <p id="ft-static" data-marker={MARKER.toLowerCase()}>Static server-rendered Solid component.</p>;
}
