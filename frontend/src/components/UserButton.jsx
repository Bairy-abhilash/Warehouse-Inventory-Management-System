/**
 * UserButton
 * ----------
 * Top-right avatar that morphs into a small account menu.
 *
 * Mechanic (from Motion's "Clerk: User Button" example): the closed button
 * and the open card are two static layouts sharing a `layoutId`, so Motion
 * morphs one container into the other. The avatar has its own `layoutId`
 * and glides from the button into the card header. Menu text fades in via
 * AnimatePresence.
 *
 * Adapted for this app:
 *   - anchored top-RIGHT (card expands down and to the left)
 *   - solid accent avatar, our radius/shadow tokens, no gradients or blur
 *   - "Manage account" → Settings, no third-party credit line
 *   - data from AuthContext (username, email, role_name)
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';

const SPRING = { type: 'spring', bounce: 0.15, visualDuration: 0.25 };

// Text content fades slightly after the container starts morphing
const contentAnim = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { delay: 0.12 } },
  exit: { opacity: 0 },
};

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M6.559 2.536A.667.667 0 0 1 7.212 2h1.574a.667.667 0 0 1 .653.536l.22 1.101c.466.178.9.429 1.287.744l1.065-.36a.667.667 0 0 1 .79.298l.787 1.362a.666.666 0 0 1-.136.834l-.845.742c.079.492.079.994 0 1.486l.845.742a.666.666 0 0 1 .137.833l-.787 1.363a.667.667 0 0 1-.791.298l-1.065-.36c-.386.315-.82.566-1.286.744l-.22 1.101a.666.666 0 0 1-.654.536H7.212a.666.666 0 0 1-.653-.536l-.22-1.101a4.664 4.664 0 0 1-1.287-.744l-1.065.36a.666.666 0 0 1-.79-.298L2.41 10.32a.667.667 0 0 1 .136-.834l.845-.743a4.7 4.7 0 0 1 0-1.485l-.845-.742a.667.667 0 0 1-.137-.833l.787-1.363a.667.667 0 0 1 .791-.298l1.065.36c.387-.315.821-.566 1.287-.744l.22-1.101ZM7.999 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M2.6 2.604A2.045 2.045 0 0 1 4.052 2h3.417c.544 0 1.066.217 1.45.604.385.387.601.911.601 1.458v.69c0 .413-.334.75-.746.75a.748.748 0 0 1-.745-.75v-.69a.564.564 0 0 0-.56-.562H4.051a.558.558 0 0 0-.56.563v7.875a.564.564 0 0 0 .56.562h3.417a.558.558 0 0 0 .56-.563v-.671c0-.415.333-.75.745-.75s.746.335.746.75v.671c0 .548-.216 1.072-.6 1.459a2.045 2.045 0 0 1-1.45.604H4.05a2.045 2.045 0 0 1-1.45-.604A2.068 2.068 0 0 1 2 11.937V4.064c0-.548.216-1.072.6-1.459Zm8.386 3.116a.743.743 0 0 1 1.055 0l1.74 1.75a.753.753 0 0 1 0 1.06l-1.74 1.75a.743.743 0 0 1-1.055 0 .753.753 0 0 1 0-1.06l.467-.47H5.858A.748.748 0 0 1 5.112 8c0-.414.334-.75.746-.75h5.595l-.467-.47a.753.753 0 0 1 0-1.06Z" />
    </svg>
  );
}

function Avatar({ initials, large = false }) {
  return (
    <motion.div
      layoutId="user-avatar"
      transition={SPRING}
      className={large ? 'user-avatar user-avatar-lg' : 'user-avatar'}
    >
      {initials}
    </motion.div>
  );
}

export default function UserButton() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const name = user?.username || user?.email || 'User';
  const email = user?.email || '';
  const role = user?.role_name || user?.role?.name || '';
  const initials = name.substring(0, 2).toUpperCase();

  // Escape closes
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Click outside closes
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="user-button">
      {/* Static label (desktop only) — not part of the morph */}
      <button type="button" className="user-info" onClick={() => setOpen(true)} tabIndex={-1} aria-hidden="true">
        <span className="name">{name}</span>
        <span className="role">{role}</span>
      </button>

      <div className="user-btn-root" ref={rootRef}>
        <AnimatePresence>
          {!open ? (
            <motion.button
              key="closed"
              type="button"
              layoutId="user-button"
              className="user-btn-closed"
              style={{ borderRadius: 99 }}
              transition={SPRING}
              onClick={() => setOpen(true)}
              aria-label="Open account menu"
              aria-haspopup="menu"
              aria-expanded={false}
            >
              <Avatar initials={initials} />
            </motion.button>
          ) : (
            <motion.div
              key="open"
              layoutId="user-button"
              className="user-btn-open"
              style={{ borderRadius: 8 }}
              transition={SPRING}
              role="menu"
            >
              <div className="user-panel-head">
                <Avatar initials={initials} large />
                <motion.div {...contentAnim} style={{ textAlign: 'center' }}>
                  <div className="user-panel-name">{name}</div>
                  {email && <div className="user-panel-email">{email}</div>}
                  {role && <span className="badge badge-primary" style={{ marginTop: 6 }}>{role}</span>}
                </motion.div>
              </div>

              <motion.div className="user-panel-actions" {...contentAnim}>
                <button
                  type="button"
                  role="menuitem"
                  className="user-panel-item"
                  onClick={() => { setOpen(false); navigate('/settings'); }}
                >
                  <GearIcon /> Settings
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="user-panel-item"
                  onClick={() => { setOpen(false); logout(); }}
                >
                  <SignOutIcon /> Sign out
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
