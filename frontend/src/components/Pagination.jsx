/**
 * Pagination
 * ----------
 * Minimal pager for the backend's PaginatedResponse
 * ({ items, total, page, size, pages }). Renders nothing when
 * everything fits on one page. Currently used by Audit Logs;
 * Products/Inventory/Purchase Orders are also paginated backend-side
 * and can adopt this component later.
 */

export default function Pagination({ page, pages, total, size, onPage }) {
  if (!pages || pages <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);

  return (
    <div className="pagination">
      <span className="pagination-info">
        Showing {from}–{to} of {total}
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
