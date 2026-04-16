export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number
): ((...args: Args) => void) & { cancel: () => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Args | null = null;

  const debounced = (...args: Args) => {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (lastArgs) fn(...lastArgs);
      timer = null;
      lastArgs = null;
    }, wait);
  };

  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timer && lastArgs) {
      clearTimeout(timer);
      fn(...lastArgs);
      timer = null;
      lastArgs = null;
    }
  };

  return debounced;
}
