/**
 * StatusBadge
 * Renders a colored badge for purchase order status.
 */

const STATUS_STYLES = {
  draft: 'badge-gray',
  submitted: 'badge-warning',
  approved: 'badge-info',
  received: 'badge-success',
  cancelled: 'badge-danger',
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'badge-gray';
  return <span className={`badge ${style}`}>{status}</span>;
}
