export default function Loading({ message = 'Loading...' }) {
  return (
    <div className="loading">
      <div className="spinner" style={{ marginBottom: 12 }} />
      <p>{message}</p>
    </div>
  );
}
