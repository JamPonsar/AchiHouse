import { useEffect, useState } from "react";
import { useAdmin, ConfirmDialog } from "../AdminApp.jsx";
import { PageTitle } from "../fields.jsx";
import { api } from "../../lib/api.js";
import { relativeTime } from "../../lib/dates.js";
import { listChanges } from "../../lib/diff.js";
import Modal from "../../components/Modal.jsx";

const KIND = { added: "Added", edited: "Changed", removed: "Removed" };

// Compare an old version with the version you're editing now, before deciding to restore it
function CompareDialog({ item, onClose, onRestore }) {
  const { draft, saveNow, hasChanges } = useAdmin();
  const [changes, setChanges] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/api/admin/history/${item.id}`)
      .then((old) => setChanges(listChanges(draft, old)))
      .catch((e) => setError(e.message));
  }, [item.id]); // eslint-disable-line

  const preview = async () => {
    const win = window.open("about:blank", "_blank");
    await saveNow(draft); // the preview compares against the saved draft
    if (win) win.location.href = `/?preview=1&compare=${item.id}&at=${encodeURIComponent(item.created_at)}`;
  };
  const when = new Date(item.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <Modal onClose={onClose} className="a-dialog a-compare" label="Compare versions">
      <div className="a-dialog-body">
        <h2>Version from {when}</h2>
        <p className="a-muted">
          Compared with {hasChanges ? "your current draft (including your unpublished changes)" : "the website as it is now"}.
        </p>
        {error && <p className="a-error">{error}</p>}
        {!changes && !error && <span className="loader" />}
        {changes && (
          changes.length === 0 ? (
            <p>This version is identical to the current one.</p>
          ) : (
            <>
              <p><strong>If you restore it, these things will change:</strong></p>
              <ul className="a-change-list a-compare-list">
                {changes.map((c, i) => (
                  <li key={i}><span className={`a-change-kind a-change-${c.kind}`}>{KIND[c.kind]}</span> {c.text}</li>
                ))}
              </ul>
            </>
          )
        )}
        <div className="a-dialog-actions">
          <button className="a-btn a-btn-quiet" onClick={onClose}>Close</button>
          <button className="a-btn" onClick={preview} disabled={!!error}>👁 Preview on the website</button>
          <button className="a-btn a-btn-primary" onClick={onRestore} disabled={!changes || changes.length === 0}>↺ Restore this version…</button>
        </div>
      </div>
    </Modal>
  );
}

export default function History() {
  const { draft, replaceDraft, setRestoreUndo, showToast, hasChanges, navigate } = useAdmin();
  const [comparing, setComparing] = useState(null);
  const [items, setItems] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const [open, setOpen] = useState({});

  useEffect(() => {
    api.get("/api/admin/history").then(setItems).catch((e) => showToast(e.message, "error"));
  }, []); // eslint-disable-line

  if (!items) return <div className="a-page"><span className="loader" /></div>;

  return (
    <div className="a-page">
      <PageTitle title="Edit history" intro="Every time changes are published, a copy of the whole website is saved here. You can bring back any earlier version." />
      <ol className="a-history">
        {items.map((h, i) => {
          const isOpen = open[h.id] ?? i < 3;
          const when = new Date(h.created_at);
          return (
            <li key={h.id} className="a-history-item">
              <div className="a-history-dot" />
              <div className="a-history-body">
                <div className="a-history-head">
                  <div>
                    <strong>{h.note || (h.changes.length ? h.changes[0] + (h.changes.length > 1 ? ` and ${h.changes.length - 1} more` : "") : "Published changes")}</strong>
                    <span className="a-muted">
                      {when.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                      {" · "}{relativeTime(h.created_at)} · by {h.author || "Admin"}
                    </span>
                  </div>
                  {i === 0 ? (
                    <span className="a-pill a-pill-ok">Live now</span>
                  ) : (
                    <span className="a-history-actions">
                      <button className="a-btn a-btn-sm" onClick={() => setComparing(h)}>⇄ Compare with current</button>
                      <button className="a-btn a-btn-sm" onClick={() => setRestoring(h)}>↺ Restore</button>
                    </span>
                  )}
                </div>
                {h.changes.length > 0 && (
                  <>
                    <button className="a-link-btn" onClick={() => setOpen({ ...open, [h.id]: !isOpen })}>
                      {isOpen ? "Hide" : "Show"} {h.changes.length} change{h.changes.length === 1 ? "" : "s"}
                    </button>
                    {isOpen && <ul className="a-change-list">{h.changes.map((c, j) => <li key={j}>{c}</li>)}</ul>}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {comparing && (
        <CompareDialog
          item={comparing}
          onClose={() => setComparing(null)}
          onRestore={() => { setRestoring(comparing); setComparing(null); }}
        />
      )}

      {restoring && (
        <ConfirmDialog
          title="Restore this version?"
          message={`The website content from ${new Date(restoring.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} will be loaded into your draft. ${hasChanges ? "⚠️ Your current unpublished changes will be replaced, but you'll get an Undo button right afterwards. " : ""}Nothing changes on the live website until you click Publish, and every version you've published stays in this list.`}
          confirmLabel="Restore into draft"
          onClose={() => setRestoring(null)}
          onConfirm={async () => {
            const r = await api.post(`/api/admin/history/${restoring.id}/restore`);
            setRestoreUndo({ draft }); // lets the person undo this restore
            replaceDraft(r.draft);
            setRestoring(null);
            showToast("Older version loaded into your draft. Use Undo restore at the top to go back.");
            navigate("/admin");
          }}
        />
      )}
    </div>
  );
}
