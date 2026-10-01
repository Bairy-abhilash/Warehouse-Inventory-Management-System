/**
 * ConditionalField
 * ----------------
 * A form field that animates open/closed. Uses Motion's native
 * `height: "auto"` animation (Motion measures the content itself), so the
 * label, input and any validation message underneath are always fully
 * visible once open.
 *
 * Adapted from Motion's "Clerk: Conditional Field" example — we keep the
 * reveal behaviour and our own .form-group / .form-error styling.
 *
 * Usage:
 *   <ConditionalField open={showPassword}>
 *     <label htmlFor="pw">Password</label>
 *     <PasswordInput id="pw" ... />
 *     {error && <div className="form-error">{error}</div>}
 *   </ConditionalField>
 */

import { AnimatePresence, motion } from 'motion/react';

const TRANSITION = { type: 'spring', bounce: 0.15, visualDuration: 0.35 };

export default function ConditionalField({ open, children }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="conditional-field"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={TRANSITION}
          style={{ overflow: 'hidden' }}
        >
          <motion.div
            className="form-group"
            initial={{ y: -8 }}
            animate={{ y: 0 }}
            transition={TRANSITION}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
