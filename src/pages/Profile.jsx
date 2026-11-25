import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Avatar from "../components/Avatar.jsx";
import { api } from "../lib/api.js";
import { formatDate } from "../lib/dates.js";
import { fullName, membershipOf } from "../lib/membership.js";
import { useUser } from "../lib/user.jsx";
import { prepareImage } from "../admin/image.js";

const FIELDS = ["firstName", "lastName", "phone", "address", "bio", "facebook", "instagram"];

export default function Profile() {
  const { user, setUser, loading, logOut } = useUser();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [state, setState] = useState({ busy: false, error: null });
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileInput = useRef(null);

  if (loading) return <div className="page-loading"><span className="loader" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const m = membershipOf(user);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const startEdit = () => { setForm(Object.fromEntries(FIELDS.map((k) => [k, user[k] || ""]))); setEditing(true); };

  const save = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: null });
    try {
      const r = await api.put("/api/auth/me", form);
      setUser(r.user);
      setEditing(false);
      setState({ busy: false, error: null });
    } catch (err) {
      setState({ busy: false, error: err.message });
    }
  };

  const changePhoto = async (file) => {
    setPhotoBusy(true);
    try {
      const { blob, type } = await prepareImage(file);
      const r = await api.uploadTo("/api/auth/photo", blob, type);
      setUser(r.user);
    } catch (err) {
      setState({ busy: false, error: err.message });
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <section className="section profile-section">
      <div className="container profile-wrap">
        <div className="profile-head">
          <button className="profile-photo" onClick={() => fileInput.current.click()} disabled={photoBusy} title="Change profile photo">
            <Avatar user={user} size={112} />
            <span>{photoBusy ? "Uploading…" : user.photo ? "Change photo" : "Add photo"}</span>
          </button>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files[0]; e.target.value = ""; if (f) changePhoto(f); }} />
          <div>
            <h1>{fullName(user)}</h1>
            <p className="muted">Member since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
            <span className={`member-pill member-${m.status}`}>{m.status === "none" ? "No membership" : `Membership: ${m.label}`}</span>
          </div>
          <button className="btn btn-outline btn-sm profile-logout" onClick={async () => { await logOut(); navigate("/"); }}>Log out</button>
        </div>

        <div className="profile-grid">
          <div className="profile-card">
            <div className="profile-card-head">
              <h2>About me</h2>
              {!editing && <button className="btn btn-outline btn-sm" onClick={startEdit}>Edit profile</button>}
            </div>
            {editing ? (
              <form className="form profile-form" onSubmit={save}>
                <div className="form-row">
                  <label>First name *<input required value={form.firstName} onChange={set("firstName")} /></label>
                  <label>Last name *<input required value={form.lastName} onChange={set("lastName")} /></label>
                </div>
                <label>Phone<input type="tel" value={form.phone} onChange={set("phone")} /></label>
                <label>Address <small className="muted">(optional)</small><textarea rows={2} value={form.address} onChange={set("address")} /></label>
                <label>Bio<textarea rows={4} value={form.bio} onChange={set("bio")} placeholder="A little about yourself" /></label>
                <div className="form-row">
                  <label>Facebook link<input value={form.facebook} onChange={set("facebook")} placeholder="facebook.com/yourname" /></label>
                  <label>Instagram link<input value={form.instagram} onChange={set("instagram")} placeholder="instagram.com/yourname" /></label>
                </div>
                {state.error && <p className="notice notice-error">{state.error}</p>}
                <div className="profile-form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                  <button className="btn btn-maroon" disabled={state.busy}>{state.busy ? "Saving…" : "Save"}</button>
                </div>
              </form>
            ) : (
              <dl className="profile-info">
                <div><dt>Email</dt><dd>{user.email}</dd></div>
                <div><dt>Phone</dt><dd>{user.phone || <span className="muted">Not added</span>}</dd></div>
                <div><dt>Address</dt><dd>{user.address || <span className="muted">Not added</span>}</dd></div>
                <div><dt>Bio</dt><dd>{user.bio || <span className="muted">Not added</span>}</dd></div>
                <div>
                  <dt>Social</dt>
                  <dd>
                    {!user.facebook && !user.instagram && <span className="muted">Not added</span>}
                    {user.facebook && <a href={user.facebook} target="_blank" rel="noreferrer">Facebook</a>}
                    {user.facebook && user.instagram && " · "}
                    {user.instagram && <a href={user.instagram} target="_blank" rel="noreferrer">Instagram</a>}
                  </dd>
                </div>
              </dl>
            )}
            {!editing && state.error && <p className="notice notice-error">{state.error}</p>}
          </div>

          <div className="profile-card">
            <h2>Membership</h2>
            {m.status === "none" ? (
              <p className="muted">You don't have a membership yet. Memberships last one year.</p>
            ) : (
              <dl className="profile-info">
                <div><dt>Status</dt><dd><span className={`member-pill member-${m.status}`}>{m.label}</span></dd></div>
                <div><dt>Purchased</dt><dd>{user.membershipPurchased ? formatDate(user.membershipPurchased) : "-"}</dd></div>
                <div><dt>{m.status === "expired" ? "Expired" : "Expires"}</dt><dd>{formatDate(user.membershipExpires)}</dd></div>
              </dl>
            )}
            <p className="muted profile-member-note">To join or renew, please <Link to="/contact">contact us</Link>.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
