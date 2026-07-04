import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  width?: number | string;
}

export default function Modal({ open, onClose, title, children, actions, width = 500 }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className={`modal-bg open`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ width: typeof width === 'number' ? `${width}px` : width }}>
        <h3>{title}</h3>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}
