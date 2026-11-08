import { useState } from "react";
import Modal from "./Modal.jsx";
import Lightbox from "./Lightbox.jsx";
import Text from "./Text.jsx";
import { formatDate, formatTimeRange, icsFor, todayKey } from "../lib/dates.js";
import { photoSrc } from "../lib/content.jsx";

export default function EventModal({ event, content, onClose }) {
  const [lightbox, setLightbox] = useState(null);
  const photos = content.photos.filter((p) => p.eventId === event.id);
  const cover = photoSrc(content, event.coverPhoto) || photos[0]?.src;
  const upcoming = event.date >= todayKey();

  return (
    <Modal onClose={onClose} className="event-modal" label={event.title}>
      {cover && <div className="event-modal-cover" style={{ backgroundImage: `url(${cover})` }} />}
      <div className="event-modal-body">
        <span className={`tag ${upcoming ? "tag-upcoming" : ""}`}>{upcoming ? "Upcoming" : "Past event"}</span>
        <h2>{event.title}</h2>
        <ul className="event-meta">
          <li><Icon name="calendar" />{formatDate(event.date)}</li>
          {event.startTime && <li><Icon name="clock" />{formatTimeRange(event.startTime, event.endTime)}</li>}
          {event.location && <li><Icon name="pin" />{event.location}</li>}
        </ul>
        <Text className="prose">{event.description || event.summary}</Text>
        {upcoming && (
          <a className="btn btn-outline btn-sm" href={icsFor(event)} download={`${event.title}.ics`}>
            + Add to my calendar
          </a>
        )}
        {photos.length > 0 && (
          <>
            <h4 className="event-photos-title">Photos ({photos.length})</h4>
            <div className="event-photos">
              {photos.map((p, i) => (
                <button key={p.id} onClick={() => setLightbox(i)} aria-label={p.caption || "Open photo"}>
                  <img src={p.src} alt={p.caption || ""} loading="lazy" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {lightbox !== null && <Lightbox photos={photos} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />}
    </Modal>
  );
}

export function Icon({ name }) {
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    pin: <><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
    heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></>,
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" /></>,
  };
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
