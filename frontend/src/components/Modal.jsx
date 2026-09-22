/**
 * Modal Component
 * ---------------
 * A reusable dialog/overlay.
 * Usage: <Modal title="Add Product" onClose={...}><form>...</form></Modal>
 */

export default function Modal({ title, onClose, children, footer, size = 'md' }) {
  const maxWidth = size === 'lg' ? '800px' : size === 'sm' ? '400px' : '600px';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
