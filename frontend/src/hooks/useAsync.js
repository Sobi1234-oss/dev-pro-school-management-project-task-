import { useCallback, useEffect, useRef, useState } from 'react';

/** Runs an async loader, ignoring stale responses. Re-runs when deps change or reload() is called. */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const ticket = useRef(0);

  const run = useCallback(() => {
    const id = ++ticket.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader()
      .then((data) => id === ticket.current && setState({ data, loading: false, error: null }))
      .catch((error) => id === ticket.current && setState((s) => ({ data: s.data, loading: false, error })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); return () => { ticket.current++; }; }, [run]);
  return { ...state, reload: run };
}

export function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}
