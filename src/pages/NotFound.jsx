import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="empty" style={{ paddingTop: 80 }}>
      <h1 style={{ fontSize: 48 }} className="num">404</h1>
      <p style={{ marginTop: 8 }}>This page doesn't exist.</p>
      <Link to="/" className="btn primary">Back to the market</Link>
    </div>
  );
}
