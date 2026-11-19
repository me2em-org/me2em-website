import { useState, useCallback, useEffect, useRef } from 'react';
import { logger } from './logger';


export function useScenario<T>(fn: () => Promise<T>) {
  const [result, setResult] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  const run = useCallback(async () => {
    setResult(null);
    setLoading(true);
    try {
      const res = await fnRef.current();
      setResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error('Scenario failed', msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setLoading(false);
  }, []);

  return { result, loading, run, clear };
}
