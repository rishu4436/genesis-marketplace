/**
 * Process-local stale-while-revalidate. Fresh hits are free.
 * Stale hits return immediately and refresh in the background.
 */

export function createSwrMem<T>(freshMs: number, staleMs: number) {
  let mem: { at: number; data: T } | null = null;
  let inflight: Promise<T> | null = null;

  function peek(): T | null {
    return mem?.data ?? null;
  }

  async function get(load: () => Promise<T>): Promise<T> {
    const now = Date.now();
    if (mem && now - mem.at < freshMs) return mem.data;
    if (mem && now - mem.at < staleMs) {
      if (!inflight) {
        inflight = load()
          .then((data) => {
            mem = { at: Date.now(), data };
            return data;
          })
          .finally(() => {
            inflight = null;
          });
      }
      return mem.data;
    }
    if (inflight) return inflight;
    inflight = load()
      .then((data) => {
        mem = { at: Date.now(), data };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  }

  function set(data: T) {
    mem = { at: Date.now(), data };
  }

  return { peek, get, set };
}
