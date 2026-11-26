// Stand-in "third-party" script for feature-tests/third-party-scripts.
// Under Partytown this runs in a web worker; DOM writes are proxied to the main thread,
// while the window global below stays inside the worker (it is not forwarded).
window.__ftThirdParty = 'ran';
document.body.setAttribute('data-third-party-ran', 'yes');
