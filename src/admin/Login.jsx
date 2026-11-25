import { useState } from "react";
import { api } from "../lib/api.js";
import PasswordInput from "../components/PasswordInput.jsx";

export default function Login({ onSuccess, expired }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/admin/login", { username, password });
      onSuccess();
    } catch (err) {
      setError(err.message);
      setPassword("");
      setBusy(false);
    }
  };

  return (
    <div className="admin a-login-wrap">
      <form className="a-login" onSubmit={submit}>
        <div className="a-login-brand">
          <strong>Achi House</strong>
          <span>Website editor</span>
        </div>
        <h1>Sign in</h1>
        {expired && <p className="a-note">Your session ended. Please sign in again. Your changes are safe and will be saved.</p>}
        <label className="a-field">
          <span className="a-label">Username</span>
          <input className="a-input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus required />
        </label>
        <label className="a-field">
          <span className="a-label">Password</span>
          <PasswordInput className="a-input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="a-error" role="alert">{error}</p>}
        <button className="a-btn a-btn-primary a-btn-lg" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <a className="a-login-back" href="/">← Back to the website</a>
      </form>
    </div>
  );
}
