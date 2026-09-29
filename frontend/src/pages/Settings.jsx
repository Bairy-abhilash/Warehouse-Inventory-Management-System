/**
 * Settings Page
 * -------------
 * 1. Your Profile        — from AuthContext (GET /auth/me data)
 * 2. Change Password     — POST /auth/change-password
 *      body: { current_password, new_password }  (new: 6–128 chars)
 *      backend 400 "Current password is incorrect" → shown under that field
 * 3. System Information  — static facts about this deployment
 *
 * There is no user-management section because the backend has no /users router.
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { getErrorMessage } from '../api/client';
import PasswordInput from '../components/PasswordInput';

const PW = { min: 6, max: 128 };

export default function Settings() {
  const { user } = useAuth();

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const setField = (name, value) => {
    setPw((f) => ({ ...f, [name]: value }));
    setFieldErrors((f) => ({ ...f, [name]: '' }));
    setSuccess('');
  };

  const validate = () => {
    const errs = {};
    if (!pw.current) errs.current = 'Current password is required';
    if (!pw.next) errs.next = 'New password is required';
    else if (pw.next.length < PW.min) errs.next = `New password must be at least ${PW.min} characters`;
    else if (pw.next === pw.current) errs.next = 'New password must be different from the current password';
    if (!pw.confirm) errs.confirm = 'Please confirm your new password';
    else if (pw.confirm !== pw.next) errs.confirm = 'Passwords do not match';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccess('');
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await authAPI.changePassword(pw.current, pw.next);
      setSuccess(res.data?.message || 'Password updated successfully');
      setPw({ current: '', next: '', confirm: '' });
      setPwOpen(false);
    } catch (err) {
      const msg = getErrorMessage(err);
      // Backend returns 400 when the current password is wrong
      if (err.response?.status === 400) {
        setFieldErrors((f) => ({ ...f, current: msg }));
      } else {
        setFormError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Profile Info */}
      <div className="card">
        <div className="card-header">
          <h3>Your Profile</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, maxWidth: 500 }}>
            <strong>Username:</strong><span>{user?.username || user?.email}</span>
            <strong>Email:</strong><span>{user?.email}</span>
            <strong>Role:</strong>
            <span><span className="badge badge-primary">{user?.role_name || user?.role?.name}</span></span>
            <strong>Password:</strong>
            <span>
              {!pwOpen && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setPwOpen(true); setSuccess(''); }}
                >
                  Change Password
                </button>
              )}
            </span>
          </div>

          {success && <div className="alert alert-success" style={{ marginTop: 16 }}>{success}</div>}

          {pwOpen && (
          <form onSubmit={handleChangePassword} noValidate style={{ maxWidth: 420, marginTop: 20 }}>
            {formError && <div className="alert alert-danger">{formError}</div>}
            <div className="form-group">
              <label htmlFor="pw-current">Current Password <span className="req">*</span></label>
              <PasswordInput
                id="pw-current"
                value={pw.current}
                onChange={(e) => setField('current', e.target.value)}
                autoComplete="current-password"
                maxLength={PW.max}
              />
              {fieldErrors.current && <div className="form-error">{fieldErrors.current}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="pw-next">New Password <span className="req">*</span></label>
              <PasswordInput
                id="pw-next"
                value={pw.next}
                onChange={(e) => setField('next', e.target.value)}
                autoComplete="new-password"
                maxLength={PW.max}
              />
              {fieldErrors.next
                ? <div className="form-error">{fieldErrors.next}</div>
                : <span className="field-hint">At least {PW.min} characters</span>}
            </div>

            <div className="form-group">
              <label htmlFor="pw-confirm">Confirm New Password <span className="req">*</span></label>
              <PasswordInput
                id="pw-confirm"
                value={pw.confirm}
                onChange={(e) => setField('confirm', e.target.value)}
                autoComplete="new-password"
                maxLength={PW.max}
              />
              {fieldErrors.confirm && <div className="form-error">{fieldErrors.confirm}</div>}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Updating...' : 'Update Password'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={() => {
                  setPwOpen(false);
                  setPw({ current: '', next: '', confirm: '' });
                  setFieldErrors({});
                  setFormError('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
          )}
        </div>
      </div>

      {/* System Info */}
      <div className="card">
        <div className="card-header">
          <h3>System Information</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 8, maxWidth: 600 }}>
            <strong>Application:</strong><span>Inventory &amp; Warehouse Management System</span>
            <strong>Version:</strong><span>1.0.0</span>
            <strong>Frontend:</strong><span>React 18 (Create React App)</span>
            <strong>Backend:</strong><span>FastAPI + SQLAlchemy 2.0</span>
            <strong>Database:</strong><span>PostgreSQL (localhost:5432)</span>
            <strong>API Docs:</strong>
            <span><a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">http://localhost:8000/docs</a></span>
          </div>
        </div>
      </div>
    </div>
  );
}
