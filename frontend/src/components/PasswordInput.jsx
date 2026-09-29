/**
 * PasswordInput
 * -------------
 * A password field with a Show / Hide toggle.
 * Used on Login, Register and the Change Password form so the
 * behaviour is identical everywhere.
 *
 * Props: everything a normal <input> accepts (value, onChange,
 * placeholder, maxLength, autoComplete, ...) plus optional `id`.
 */

import { useState } from 'react';

export default function PasswordInput({ id, className = 'form-control', ...rest }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        className={className}
        {...rest}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        tabIndex={-1}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
