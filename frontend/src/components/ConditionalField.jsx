/**
 * ConditionalField
 * ----------------
 * A form field that animates open/closed. The outer container animates to
 * the *measured* height of its content (Motion's resize() observer), so the
 * reveal stays smooth even when a validation message appears underneath.
 *
 * Adapted from Motion's "Clerk: Conditional Field" example:
 *   - kept:    resize() height animation, AnimatePresence fade/slide
 *   - dropped: its own CSS, gradient button, 2rem rounding, onBlur auto-close
 *   - uses:    our .form-group / label / .form-error classes and tokens
 *
 * Usage:
 *   <ConditionalField open={showPassword}>
 *     <label htmlFor="pw">Password</label>
 *     <PasswordInput id="pw" ... />
 *     {error && <div className="form-error">{error}</div>}
 *   </ConditionalField>
 */

import { useCallback, useState } from 'react';
import { AnimatePresence, motion, resize } from 'motion/react';

// One-shot spring: precise, not bouncy. No looping animations anywhere.
const TRANSITION = { type: 'spring', bounce: 0.15, visualDuration: 0.35 };

export default function ConditionalField({ open, children }) {
  const [height, setHeight] = useState(0);

  // Ref callback: subscribe to size changes of the inner content.
  // resize() returns an unsubscribe fn, which React calls on unmount.
  const measureRef = useCallback((el) => {
    if (!el) return undefined;
    return resize(el, (_, { height: h }) => setHeight(h));
  }, []);

  return (
    <motion.div
      animate={{ height: open ? height : 0 }}
      transition={TRANSITION}
      style={{ overflow: 'hidden', willChange: 'height' }}
    >
      <div ref={measureRef}>
        <AnimatePresence mode="popLayout" initial={false}>
          {open && (
            <motion.div
              key="conditional-field"
              className="form-group"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 0 }}
              transition={TRANSITION}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
