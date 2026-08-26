/* Vitest global setup for the client. */
import '@testing-library/jest-dom/vitest';

/* jsdom lacks these; several hooks/components call them. */
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return false; },
  });
}
if (!window.requestIdleCallback) {
  window.requestIdleCallback = (cb) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 0);
  window.cancelIdleCallback = (id) => clearTimeout(id);
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}
