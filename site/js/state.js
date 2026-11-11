// A tiny store shared by every section: the reader's selection lives here.
// A subscriber that throws is reported and skipped, so one broken section never
// stops the others from updating.

export function createStore(initial, { onError = (err) => console.error('A section failed to update', err) } = {}) {
  let state = { ...initial };
  const subscribers = new Set();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      for (const fn of [...subscribers]) {
        try { fn(state); } catch (err) { onError(err); }
      }
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}
