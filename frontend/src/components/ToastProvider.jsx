import { useCallback, useMemo, useState } from 'react';
import ToastContext from './ToastContext';

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((previous) => [...previous, { id, message, type }]);
    setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, 3100);
  }, []);

  const contextValue = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => {
          const icons = { success: 'check_circle', error: 'error', info: 'info' };
          return (
            <div key={toast.id} className={`toast ${toast.type}`}>
              <span className="material-icons-outlined">{icons[toast.type] || 'info'}</span>
              {toast.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
