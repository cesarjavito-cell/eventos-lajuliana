import { useSearchParams } from 'react-router-dom';

export function useUrlDialog(paramName) {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentDialog = searchParams.get('dialog');
  const currentId = searchParams.get('id');

  const isOpen = currentDialog === paramName;
  const id = isOpen ? currentId : null;

  const open = (targetId = null) => {
    const next = new URLSearchParams(searchParams);
    next.set('dialog', paramName);
    if (targetId) {
      next.set('id', targetId);
    } else {
      next.delete('id');
    }
    setSearchParams(next, { replace: false });
  };

  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('dialog');
    next.delete('id');
    setSearchParams(next, { replace: false });
  };

  return { isOpen, id, open, close };
}
