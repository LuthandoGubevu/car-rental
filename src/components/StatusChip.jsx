const GROUPS = {
  orange: { bg: '#fff3e8', fg: '#b45309', bd: '#f6dcc4', dot: '#f47724' },
  green: { bg: '#eaf7ef', fg: '#15803d', bd: '#cfeadb', dot: '#22a35a' },
  red: { bg: '#fdf1f1', fg: '#b91c1c', bd: '#f4d3d3', dot: '#dc2626' },
  amber: { bg: '#fef6e7', fg: '#92400e', bd: '#f0e0bf', dot: '#d99a2b' },
  blue: { bg: '#eef4fb', fg: '#1d4ed8', bd: '#d5e2f4', dot: '#3b6fd4' },
  purple: { bg: '#f3f0fc', fg: '#6d28d9', bd: '#e2dbf6', dot: '#8b5cf6' },
  grey: { bg: '#f2f4f7', fg: '#5b6b7a', bd: '#e4e8ee', dot: '#9aa5b1' },
};

const STYLES = {
  'Awaiting Review': GROUPS.orange,
  'Inspection Due': GROUPS.orange,
  New: GROUPS.orange,
  Reviewed: GROUPS.green,
  Contacted: GROUPS.green,
  'Active Lease': GROUPS.green,
  Good: GROUPS.green,
  Declined: GROUPS.red,
  'Attention needed': GROUPS.red,
  'Accident Repair': GROUPS.red,
  Logged: GROUPS.amber,
  Fair: GROUPS.amber,
  'Under Review': GROUPS.amber,
  Submitted: GROUPS.blue,
  Available: GROUPS.blue,
  Admin: GROUPS.blue,
  Maintenance: GROUPS.purple,
  'Not yet assessed': GROUPS.grey,
  Missed: GROUPS.grey,
  Returned: GROUPS.grey,
  Driver: GROUPS.grey,
  Staff: GROUPS.purple,
  Active: GROUPS.green,
  Trial: GROUPS.amber,
  Inactive: GROUPS.grey,
  Invited: GROUPS.amber,
};

export function StatusChip({ status }) {
  const s = STYLES[status] || GROUPS.grey;
  return (
    <span className="chip" style={{ background: s.bg, color: s.fg, borderColor: s.bd }}>
      <span className="chip-dot" style={{ background: s.dot }} />
      {status}
    </span>
  );
}
