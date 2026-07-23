import { useContext } from 'react';
import ToastContext from './ToastContext';

export default function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast yalnızca ToastProvider içinde kullanılabilir');
  return context;
}
