/**
 * Register Page
 * -------------
 * Calls POST /auth/register. Backend rules (schemas/auth.py → UserRegister):
 *   username: 3–100 chars
 *   email:    valid email, must be unique (409 "Email is already registered")
 *   password: 6–128 chars
 * New users are saved in the `users` table with the default Employee/staff
 * role — role is decided by the backend, never by this form.
 * The response is a TokenResponse, so a successful sign-up logs you in.
 */

import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import PasswordInput from '../components/PasswordInput';
import ConditionalField from '../components/ConditionalField';

const LIMITS = { username: { min: 3, max: 100 }, password: { min: 6, max: 128 } };

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((f) => ({ ...f, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    const username = form.username.trim();
    const email = form.email.trim();

    if (!username) errs.username = 'Username is required';
    else if (username.length < LIMITS.username.min) errs.username = `Username must be at least ${LIMITS.username.min} characters`;

    if (!email) errs.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email address';

    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < LIMITS.password.min) errs.password = `Password must be at least ${LIMITS.password.min} characters`;

    if (!form.confirm) errs.confirm = 'Please confirm your password';
    else if (form.confirm !== form.password) errs.confirm = 'Passwords do not match';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/dashboard');
    } catch (err) {
      const msg = getErrorMessage(err);
      // Backend 409 for duplicate email → show under the email field
      if (err.response?.status === 409) {
        setFieldErrors((f) => ({ ...f, email: msg }));
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>INVENTORY MS</h1>
        <p className="subtitle">Create your account</p>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="reg-username">Username <span className="req">*</span></label>
            <input
              id="reg-username"
              type="text"
              className="form-control"
              value={form.username}
              onChange={(e) => setField('username', e.target.value)}
              placeholder="e.g. priya.sharma"
              autoComplete="username"
              maxLength={LIMITS.username.max}
            />
            {fieldErrors.username
              ? <div className="form-error">{fieldErrors.username}</div>
              : <span className="field-hint">{LIMITS.username.min}–{LIMITS.username.max} characters</span>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email Address <span className="req">*</span></label>
            <input
              id="reg-email"
              type="email"
              className="form-control"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              maxLength={150}
            />
            {fieldErrors.email && <div className="form-error">{fieldErrors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Password <span className="req">*</span></label>
            <PasswordInput
              id="reg-password"
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              placeholder="Choose a password"
              autoComplete="new-password"
              maxLength={LIMITS.password.max}
            />
            {fieldErrors.password
              ? <div className="form-error">{fieldErrors.password}</div>
              : <span className="field-hint">At least {LIMITS.password.min} characters</span>}
          </div>

          {/* Confirm Password only appears once a password has been typed */}
          <ConditionalField open={form.password.length > 0}>
            <label htmlFor="reg-confirm">Confirm Password <span className="req">*</span></label>
            <PasswordInput
              id="reg-confirm"
              value={form.confirm}
              onChange={(e) => setField('confirm', e.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              maxLength={LIMITS.password.max}
            />
            {fieldErrors.confirm && <div className="form-error">{fieldErrors.confirm}</div>}
          </ConditionalField>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
