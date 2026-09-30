/**
 * ToastContext
 * ------------
 * Small stacked notifications in the bottom-right corner.
 *
 *   const toast = useToast();
 *   toast.success('Product OFFC-001 created');
 *   toast.error('Could not save');       // rarely needed — form errors stay inline
 *   toast.info('Copied');
 *
 * Toasts auto-dismiss after 4 s (hover pauses nothing on purpose — keep it
 * simple), can be dismissed manually, and the stack re-flows with a layout
 * animation when one leaves. Newest at the bottom, max 4 visible.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const ToastContext = createContext(null);

const DURATION_MS = 4000;
const MAX_VISIBLE = 4;

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type, message) => {
    const id = ++idRef.current;
    setToasts((list) => [...list, { id, type, message }].slice(-MAX_VISIBLE));
    window.setTimeout(() => dismiss(id), DURATION_MS);
    return id;
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
    dismiss,
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="toast-viewport" aria-live="polite" aria-atomic="false">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              role="status"
              className={`toast toast-${t.type}`}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: 'spring', bounce: 0.15, visualDuration: 0.3 }}
            >
              <span className="toast-icon">
                {t.type === 'success' ? <CheckIcon /> : <AlertIcon />}
              </span>
              <span className="toast-message">{t.message}</span>
              <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <CloseIcon />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
