import { useNavigate } from 'react-router-dom';

const C = {
  primary: 'var(--primary)',
  ink: 'var(--text)',
  inkMid: 'var(--text-muted)',
  border: 'var(--border)',
  surface: 'var(--surface)',
  surfaceDeep: 'var(--bg)',
};

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: C.surfaceDeep, minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ maxWidth: 520, width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Access denied</div>
        <p style={{ fontSize: 14, color: C.inkMid, margin: 0, lineHeight: 1.6 }}>
          Your role does not have permission to view this page.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            marginTop: 20,
            background: C.primary,
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '10px 18px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
