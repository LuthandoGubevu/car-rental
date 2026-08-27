export function Toast({ message, kind = 'ok' }) {
  if (!message) return null;
  return <div className={`toast toast-${kind}`}>{message}</div>;
}
