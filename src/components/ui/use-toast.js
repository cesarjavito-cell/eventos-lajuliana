import toast from 'react-hot-toast';

export const useToast = () => {
  return {
    toast: (opts) => {
      if (typeof opts === 'string') return toast(opts);
      if (opts?.variant === 'destructive') {
        return toast.error(opts.description ? `${opts.title || 'Error'}: ${opts.description}` : (opts.title || 'Error'));
      }
      return toast(opts.description ? `${opts.title || ''}: ${opts.description}` : (opts.title || ''));
    },
    dismiss: (toastId) => toast.dismiss(toastId),
  };
};

export { toast };
