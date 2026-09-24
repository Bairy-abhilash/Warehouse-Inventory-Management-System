/**
 * Audit Logs Page (Admin / Manager only)
 * --------------------------------------
 * Read-only view of GET /audit-logs/ — the system audit trail.
 *
 * Contract (verified against backend code, not assumed):
 * - Authorization: admin + manager, enforced server-side. Hiding the nav
 *   item is only UX; this page also refuses to fire a request it knows
 *   would be rejected with 403.
 * - Query params: entity_type, user_id, page, size (size max 100)
 * - Item fields: id, user_id, username, action (stored UPPERCASE),
 *   entity_type (stored lowercase), entity_id, details, created_at
 *   (reverse chronological order)
 *
 * Honest-coverage note: the backend currently WRITES audit rows only for
 * product create/delete (see app/services/product_service.py). The entity
 * filter therefore lists only the value that can actually match — extend
 * ENTITY_TYPES as backend audit coverage grows. Nothing here is invented.
 */

import { useState, useEffect } from 'react';
import { auditAPI } from '../api';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 20;

// Only entity types the backend currently writes (see header comment).
const ENTITY_TYPES = ['product'];

const ACTION_BADGES = {
  CREATE: 'badge-success',
  UPDATE: 'badge-info',
  DELETE: 'badge-danger',
};

export default function AuditLogs() {
  const { hasRole } = useAuth();
  const canView = hasRole('admin', 'manager');

  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await auditAPI.list({
        page,
        size: PAGE_SIZE,
        entity_type: entityType || undefined,
      });
      const data = res.data || {};
      setLogs(data.items || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, entityType, canView]);

  const onFilterChange = (e) => {
    setEntityType(e.target.value);
    setPage(1); // new filter = restart from first page
  };

  // Backend would 403 this role anyway — don't even call.
  if (!canView) {
    return (
      <EmptyState
        title="Restricted area"
        message="Audit logs are available to Admin and Manager roles only."
      />
    );
  }

  return (
    <div>
      <div className="toolbar">
        <select
          className="form-control"
          style={{ width: 200 }}
          value={entityType}
          onChange={onFilterChange}
          aria-label="Filter by entity type"
        >
          <option value="">All entity types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        {loading ? (
          <Loading message="Loading audit trail..." />
        ) : logs.length === 0 ? (
          <EmptyState
            title="No audit events"
            message="Actions recorded by the system will appear here."
          />
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td>{log.username || (log.user_id ? `User #${log.user_id}` : 'System')}</td>
                      <td>
                        <span className={`badge ${ACTION_BADGES[log.action] || 'badge-gray'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <strong>{log.entity_type}</strong>
                        {log.entity_id != null ? ` #${log.entity_id}` : ''}
                      </td>
                      <td>{log.details || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pages={pages} total={total} size={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
