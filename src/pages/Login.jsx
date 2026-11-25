import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useUser } from "../lib/user.jsx";
import PasswordInput from "../components/PasswordInput.jsx";

const EMPTY = { firstName: "", lastName: "", email: "", phone: "", password: "", website: "" };

// Log in, or create a new member account
export default function Login() {
  const { user, setUser, loading } = useUser();
  const navigate = useNavigate();
  // After logging in, go back to where they came from (e.g. the event they wanted to RSVP to)
  const [params] = useSearchParams();
  const wanted = params.get("next") || "";
  const next = wanted.startsWith("/") && !wanted.startsWith("//") ? wanted : "/profile";
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState({ busy: false, error: null });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const switchTo = (m) => { setMode(m); setState({ busy: false, error: null }); };

  if (!loading && user) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: null });
    try {
      const body = mode === "login" ? { email: form.email, password: form.password } : form;
      const r = await api.post(`/api/auth/${mode === "login" ? "login" : "signup"}`, body);
      setUser(r.user);
      navigate(next);
    } catch (err) {
      setState({ busy: false, error: err.message });
    }
  };

  return (
    <section className="section auth-section">
      <div className="container auth-wrap">
        <div className="auth-card">
          <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="muted">{mode === "login" ? "Log in to see your profile and membership." : "Join the Achi House community online."}</p>
          <form className="form auth-form" onSubmit={submit}>
            <input type="text" name="website" value={form.website} onChange={set("website")} className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            {mode === "signup" && (
              <div className="form-row">
                <label>First name *<input required autoComplete="given-name" value={form.firstName} onChange={set("firstName")} /></label>
                <label>Last name *<input required autoComplete="family-name" value={form.lastName} onChange={set("lastName")} /></label>
              </div>
            )}
            <label>Email *<input required type="email" autoComplete="email" value={form.email} onChange={set("email")} /></label>
            {mode === "signup" && <label>Phone<input type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} /></label>}
            <label>
              Password *
              <PasswordInput
                required
                minLength={mode === "signup" ? 8 : undefined}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={form.password}
                onChange={set("password")}
              />
              {mode === "signup" && <small className="muted">At least 8 characters.</small>}
            </label>
            {state.error && <p className="notice notice-error">{state.error}</p>}
            <button className="btn btn-maroon" disabled={state.busy}>
              {state.busy ? "One moment…" : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
          <p className="auth-switch">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={() => switchTo(mode === "login" ? "signup" : "login")}>
              {mode === "login" ? "Sign up!" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}
