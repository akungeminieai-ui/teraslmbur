import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export function useAppToast() {
  const t = useTranslations('common');

  return {
    success: (action: 'create' | 'update' | 'delete' | 'duplicate', entity: string) => {
      toast.success(t(`toasts.success.${action}`, { entity }));
    },
    error: (action: 'save' | 'delete' | 'generic', entity?: string) => {
      if (action === 'save') {
        toast.error(t('toasts.error.save', { entity }));
      } else if (action === 'delete') {
        toast.error(t('toasts.error.delete', { entity }));
      } else {
        toast.error(t('toasts.error.generic'));
      }
    },
    warning: (message: string) => {
      toast.warning(message);
    },
    info: (message: string) => {
      toast.info(message);
    },
    rawSuccess: (message: string) => {
      toast.success(message);
    },
    rawError: (message: string) => {
      toast.error(message);
    },
  };
}
