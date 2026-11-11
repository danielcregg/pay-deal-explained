// A tiny store shared by every section: the reader's selection lives here.
// A subscriber that throws is reported and skipped, so one broken section never
// stops the others from updating.

export function createStore(initial, { onError = (err) => console.error('A section failed to update', err) } = {}) {
  let state = { ...initial };
  const subscribers = new Set();
  const tell = (meta) => {
    for (const fn of [...subscribers]) {
      try { fn(state, meta); } catch (err) { onError(err); }
    }
  };
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      tell({ reset: false });
    },
    /** Replace everything ("clear my choices"). Subscribers are told, so they can drop what they hold themselves. */
    reset(next) {
      state = { ...next };
      tell({ reset: true });
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}
