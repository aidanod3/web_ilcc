/*
 * breakpointGutter.js — click the gutter to toggle a breakpoint on a line.
 * Exposes: breakpointsField (Set of 1-based lines), toggleBreakpoint effect,
 * breakpointGutter extension, and a helper to read the current set.
 */
import { EditorView, gutter, GutterMarker } from '@codemirror/view';
import { StateEffect, StateField, RangeSet } from '@codemirror/state';

export const toggleBreakpoint = StateEffect.define({ map: (v, m) => ({ ...v, pos: m.mapPos(v.pos) }) });
export const clearBreakpoints = StateEffect.define();

class BreakpointMarker extends GutterMarker {
  toDOM() {
    const el = document.createElement('div');
    el.className = 'cm-breakpoint-marker';
    el.title = 'Breakpoint (click to remove)';
    return el;
  }
}
const marker = new BreakpointMarker();

/* RangeSet of markers keyed by line start position. */
export const breakpointsField = StateField.define({
  create: () => RangeSet.empty,
  update(set, tr) {
    set = set.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(clearBreakpoints)) set = RangeSet.empty;
      if (e.is(toggleBreakpoint)) {
        const { pos, on } = e.value;
        if (on) set = set.update({ add: [marker.range(pos)] });
        else set = set.update({ filter: (from) => from !== pos });
      }
    }
    return set;
  },
});

export function hasBreakpointAt(state, pos) {
  let found = false;
  state.field(breakpointsField).between(pos, pos, () => { found = true; return false; });
  return found;
}

/* Returns sorted 1-based line numbers with breakpoints. */
export function getBreakpointLines(state) {
  const lines = [];
  const it = state.field(breakpointsField).iter();
  while (it.value) { lines.push(state.doc.lineAt(it.from).number); it.next(); }
  return lines;
}

export const breakpointGutter = [
  breakpointsField,
  gutter({
    class: 'cm-breakpoint-gutter',
    markers: (v) => v.state.field(breakpointsField),
    initialSpacer: () => marker,
    domEventHandlers: {
      mousedown(view, line) {
        const on = !hasBreakpointAt(view.state, line.from);
        view.dispatch({ effects: toggleBreakpoint.of({ pos: line.from, on }) });
        return true;
      },
    },
  }),
  EditorView.baseTheme({
    '.cm-breakpoint-gutter .cm-gutterElement': { width: '14px', cursor: 'pointer', paddingLeft: '2px' },
    '.cm-breakpoint-marker': {
      width: '10px', height: '10px', marginTop: '4px', borderRadius: '50%',
      background: 'var(--red, #e5484d)', boxShadow: '0 0 0 2px rgba(229,72,77,0.25)',
    },
    '.cm-breakpoint-gutter .cm-gutterElement:hover::after': {
      content: '""', display: 'block', width: '10px', height: '10px', marginTop: '4px',
      borderRadius: '50%', background: 'var(--red, #e5484d)', opacity: 0.3,
    },
  }),
];
