export default function Button({ variant="primary", className="", style={}, ...props }) {
  const baseStyle = {
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: 14,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  };

  const variants = {
    primary: {
      backgroundColor: '#1358FF',
      color: 'white',
    },
    secondary: {
      backgroundColor: '#F1F5F9',
      color: '#475569',
    },
    danger: {
      backgroundColor: '#EF4444',
      color: 'white',
    },
    success: {
      backgroundColor: '#02C39A',
      color: 'white',
    }
  };

  const finalStyle = {
    ...baseStyle,
    ...variants[variant],
    ...style,
  };

  return <button style={finalStyle} className={className} {...props} />;
}