import { useContent } from "../lib/content.jsx";

// Friendly message shown when there are no upcoming events
export default function NoUpcoming() {
  const { content } = useContent();
  const { facebook, instagram } = content.settings;
  return (
    <div className="empty-events">
      <strong>No upcoming events yet.</strong>
      <p>
        Keep an eye out on our{" "}
        {facebook && <a href={facebook} target="_blank" rel="noreferrer">Facebook</a>}
        {facebook && instagram && " or "}
        {instagram && <a href={instagram} target="_blank" rel="noreferrer">Instagram</a>}
        {!facebook && !instagram && "social media"} for updates!
      </p>
    </div>
  );
}
