/*
 * useTour — first-load walkthrough built on driver.js.
 *
 *   startTour('basics' | 'debug')  — imperative; safe to call from anywhere
 *   useTour()                       — mount in the editor page to auto-start
 *                                     on first visit or when ?tour= is set
 *
 * Seen-state lives in localStorage['ilcc.tour.v1'] as { basics, debug, at }.
 * Two driver instances: the basics tour ends by clicking Debug and handing
 * off to the debug tour once the debugger panel mounts, because driver.js
 * measures targets at step-entry and the debug panel remounts the layout.
 */
import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../tour/tour.css';
import { STEPS } from '../tour/steps';

const KEY = 'ilcc.tour.v1';
const read  = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const write = (patch) => { try { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch, at: Date.now() })); } catch { /* private mode */ } };

export const hasSeenTour = (part = 'basics') => !!read()[part];
export const resetTour = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } };

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* Wait (up to ms) for a selector to appear. */
const waitFor = (sel, ms = 4000) => new Promise((resolve) => {
  const t0 = Date.now();
  const tick = () => {
    const el = document.querySelector(sel);
    if (el) return resolve(el);
    if (Date.now() - t0 > ms) return resolve(null);
    requestAnimationFrame(tick);
  };
  tick();
});

let active = null;

export function startTour(part = 'basics') {
  if (active) { try { active.destroy(); } catch { /* ignore */ } active = null; }
  const steps = STEPS[part];
  if (!steps) return;

  /* Only keep steps whose target exists right now (e.g. no stdin row yet). */
  const present = steps.filter(s => !s.element || document.querySelector(s.element) || s.optional === false);

  const d = driver({
    showProgress: true,
    allowClose: true,
    animate: !reduced(),
    overlayOpacity: 0.6,
    stagePadding: 6,
    popoverClass: 'ilcc-tour',
    progressText: '{{current}} / {{total}}',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: part === 'basics' ? 'Start debugging →' : 'Done',
    steps: present.map(s => ({
      element: s.element,
      popover: {
        title: s.title,
        description: s.description,
        side: s.side || 'bottom',
        align: s.align || 'start',
        ...(s.first ? { showButtons: ['next', 'close'], closeBtnText: 'Skip tour' } : {}),
      },
      onHighlightStarted: s.onEnter,
    })),
    onDestroyStarted: async () => {
      /* Finishing the basics tour hands off to the debug tour. */
      const last = d.isLastStep();
      d.destroy();
      write({ [part]: true });
      if (part === 'basics' && last) {
        const btn = document.querySelector('[data-tour="debug"]');
        if (btn && !btn.disabled) {
          btn.click();
          if (await waitFor('[data-panel-id="debugger"]')) setTimeout(() => startTour('debug'), 250);
        }
      }
    },
    onDestroyed: () => { active = null; },
  });
  active = d;
  d.drive();
  return d;
}

/* Auto-start on the editor page. */
export default function useTour({ ready = true } = {}) {
  const started = useRef(false);   // StrictMode double-mount guard
  useEffect(() => {
    if (!ready || started.current) return;
    const params = new URLSearchParams(window.location.search);
    const force = params.get('tour');
    if (force) {
      params.delete('tour');
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
    const part = force === 'debug' ? 'debug' : 'basics';
    if (!force && hasSeenTour('basics')) return;
    started.current = true;
    const kick = () => setTimeout(() => startTour(part), 400);
    if ('requestIdleCallback' in window) requestIdleCallback(kick, { timeout: 1500 }); else setTimeout(kick, 300);
  }, [ready]);
}
