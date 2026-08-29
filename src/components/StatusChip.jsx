const STYLES = {
  'Awaiting Review': { bg: '#FFF1E6', fg: '#B45309' },
  Reviewed: { bg: '#DCFCE7', fg: '#15803D' },
  Declined: { bg: '#FEE2E2', fg: '#B91C1C' },
  Submitted: { bg: '#DBEAFE', fg: '#1D4ED8' },
  Missed: { bg: '#F1F5F9', fg: '#475569' },
  Logged: { bg: '#FEF3C7', fg: '#92400E' },
  'Active Lease': { bg: '#DCFCE7', fg: '#15803D' },
  Available: { bg: '#DBEAFE', fg: '#1D4ED8' },
  'Inspection Due': { bg: '#FFF1E6', fg: '#B45309' },
  'Under Review': { bg: '#FEF3C7', fg: '#92400E' },
  Maintenance: { bg: '#EDE9FE', fg: '#6D28D9' },
  'Accident Repair': { bg: '#FEE2E2', fg: '#B91C1C' },
  Returned: { bg: '#F1F5F9', fg: '#475569' },
  Good: { bg: '#DCFCE7', fg: '#15803D' },
  Fair: { bg: '#FEF3C7', fg: '#92400E' },
  'Attention needed': { bg: '#FEE2E2', fg: '#B91C1C' },
  'Not yet assessed': { bg: '#F1F5F9', fg: '#475569' },
};

export function StatusChip({ status }) {
  const style = STYLES[status] || { bg: '#F1F5F9', fg: '#475569' };
  return (
    <span className="chip" style={{ background: style.bg, color: style.fg }}>
      {status}
    </span>
  );
}
