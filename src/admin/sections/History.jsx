import { useEffect, useState } from "react";
import { useAdmin, ConfirmDialog } from "../AdminApp.jsx";
import { PageTitle } from "../fields.jsx";
import { api } from "../../lib/api.js";
import { relativeTime } from "../../lib/dates.js";

export default function History() {
  const { replaceDraft, showToast, hasChanges, navigate } = useAdmin();
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
                    <button className="a-btn a-btn-sm" onClick={() => setRestoring(h)}>↺ Restore this version</button>
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

      {restoring && (
        <ConfirmDialog
          title="Restore this version?"
          message={`The website content from ${new Date(restoring.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} will be loaded into your draft. ${hasChanges ? "⚠️ Your current unpublished changes will be replaced. " : ""}Nothing changes on the live website until you click Publish. You can preview it first, or click Discard to cancel.`}
          confirmLabel="Restore into draft"
          onClose={() => setRestoring(null)}
          onConfirm={async () => {
            const r = await api.post(`/api/admin/history/${restoring.id}/restore`);
            replaceDraft(r.draft);
            setRestoring(null);
            showToast("Older version loaded into your draft. Preview it, then Publish to make it live.");
            navigate("/admin");
          }}
        />
      )}
    </div>
  );
}
