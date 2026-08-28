import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export function useUrlDialog(paramName) {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramValue = searchParams.get(paramName);
  const isOpen = paramValue !== null;

  const open = useCallback((value = 'true') => {
    const next = new URLSearchParams(searchParams);
    next.set(paramName, value);
    setSearchParams(next);
  }, [paramName, searchParams, setSearchParams]);

  const close = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete(paramName);
    setSearchParams(next);
  }, [paramName, searchParams, setSearchParams]);

  return { isOpen, paramValue, open, close };
}
