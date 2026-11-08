import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <section className="section">
      <div className="container narrow center">
        <h1>Page not found</h1>
        <p className="muted">Sorry, we couldn't find that page.</p>
        <Link to="/" className="btn btn-maroon">Back to home</Link>
      </div>
    </section>
  );
}
