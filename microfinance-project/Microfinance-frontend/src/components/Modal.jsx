import { useEffect } from "react";

export default function Modal({ open, onClose, title, children, width=720 }) {
  useEffect(() => {
    function onKey(e){ if(e.key==="Escape") onClose?.(); }
    if(open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if(!open) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'grid',
      placeItems: 'center',
      zIndex: 1000,
    }} onMouseDown={onClose}>
      <div className="modal" style={{
        width,
        backgroundColor: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
      }} onMouseDown={(e)=>e.stopPropagation()}>
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              padding: 0,
              color: '#64748B',
            }}
            aria-label="Close"
          >×</button>
        </div>
        <div style={{ padding: '1.5rem', flex: 1, overflow: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}