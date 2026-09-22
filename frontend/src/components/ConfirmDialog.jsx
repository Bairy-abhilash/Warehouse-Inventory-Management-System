/**
 * ConfirmDialog
 * Simple yes/no confirmation modal.
 */

import Modal from './Modal';

export default function ConfirmDialog({ title, message, onConfirm, onCancel, confirmText = 'Confirm', danger = false }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
