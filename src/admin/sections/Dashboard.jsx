import { Link } from "react-router-dom";
import { useAdmin } from "../AdminApp.jsx";
import { Card } from "../fields.jsx";
import { todayKey } from "../../lib/dates.js";

export default function Dashboard({ newRequests, onPublish }) {
  const { draft, hasChanges, changes } = useAdmin();
  const upcoming = draft.events.filter((e) => e.date >= todayKey()).length;

  return (
    <div className="a-page">
      <div className="a-welcome">
        <h1>Welcome! 👋</h1>
        <p>This is where you update the Achi House website. Choose a page on the left to start editing.</p>
      </div>

      <Card title="How it works">
        <ol className="a-steps">
          <li><span>1</span><div><strong>Make your changes</strong><p>Edit text, add events, or upload photos. Everything is saved automatically as a <em>draft</em>. Visitors won't see it yet.</p></div></li>
          <li><span>2</span><div><strong>Preview</strong><p>Click <b>👁 Preview</b> at the top to see exactly how the website will look.</p></div></li>
          <li><span>3</span><div><strong>Publish</strong><p>When you're happy, click <b>Publish changes</b>. Now everyone can see them. Every publish is saved in <Link to="/admin/history">Edit history</Link>, so you can always go back.</p></div></li>
        </ol>
      </Card>

      {hasChanges && (
        <Card title="Your unpublished changes" help="These are saved as a draft but not on the website yet.">
          <ul className="a-change-list">{(changes.length ? changes : ["Small edits"]).map((c, i) => <li key={i}>{c}</li>)}</ul>
          <button className="a-btn a-btn-primary" onClick={onPublish}>Publish changes</button>
        </Card>
      )}

      <div className="a-quick">
        <Link to="/admin/events/new" className="a-quick-card"><span>📅</span><strong>Add an event</strong><small>{upcoming} upcoming</small></Link>
        <Link to="/admin/photos" className="a-quick-card"><span>📷</span><strong>Upload photos</strong><small>{draft.photos.length} in library</small></Link>
        <Link to="/admin/requests" className="a-quick-card"><span>✉️</span><strong>Messages & requests</strong><small>{newRequests ? `${newRequests} new` : "No new messages"}</small></Link>
        <Link to="/admin/home" className="a-quick-card"><span>🖼️</span><strong>Edit home page</strong><small>Slideshow & welcome text</small></Link>
      </div>
    </div>
  );
}
