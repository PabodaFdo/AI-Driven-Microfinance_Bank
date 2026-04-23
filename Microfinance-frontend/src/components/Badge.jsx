const statusStyles = {
  PENDING: { backgroundColor: '#FEF3C7', color: '#92400E', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500 },
  REVIEW: { backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500 },
  APPROVED: { backgroundColor: '#D1FAE5', color: '#065F46', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500 },
  REJECTED: { backgroundColor: '#FEE2E2', color: '#991B1B', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500 },
  CANCELLED: { backgroundColor: '#F3F4F6', color: '#374151', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500 },
};

export default function Badge({ value }) {
  const style = statusStyles[value] || statusStyles.PENDING;
  return <span style={style}>{value}</span>;
}