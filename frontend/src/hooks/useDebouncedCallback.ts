import { useEffect, useRef } from 'react';

export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delay: number,
) {
  const timeoutRef = useRef<number | undefined>();
  const cbRef = useRef(callback);

  cbRef.current = callback;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debounced = (...args: Parameters<T>) => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      cbRef.current(...args);
    }, delay);
  };

  return debounced as T;
}

