import { useEffect, useRef } from "react";

// Calls `fn` now and then every `ms` while `enabled`, skipping ticks while the
// tab is hidden and catching up as soon as it's visible again.
export const usePoll = (fn, ms, enabled = true) => {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (!enabled) return undefined;
    let stopped = false;
    const tick = () => {
      if (!stopped && !document.hidden) saved.current();
    };
    tick();
    const id = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [ms, enabled]);
};
