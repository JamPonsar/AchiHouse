import { useMemo, useState } from "react";
import MonthCalendar from "../components/MonthCalendar.jsx";
import EventModal, { Icon } from "../components/EventModal.jsx";
import NoUpcoming from "../components/NoUpcoming.jsx";
import PageHeader from "./PageHeader.jsx";
import { coverStyle, galleryPhotos, useContent, photoSrc } from "../lib/content.jsx";
import { formatDate, formatTime, formatTimeRange, fromKey, sortEvents, todayKey } from "../lib/dates.js";

export default function Events() {
  const { content, deletedEvents } = useContent();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [openEvent, setOpenEvent] = useState(null);
  const [tab, setTab] = useState("upcoming");
  const today = todayKey();

  const byDate = useMemo(() => {
    const map = {};
    for (const ev of sortEvents(content.events)) (map[ev.date] ||= []).push(ev);
    return map;
  }, [content.events]);

  const upcoming = sortEvents(content.events.filter((e) => e.date >= today));
  const past = sortEvents(content.events.filter((e) => e.date < today), -1);
  const current = tab === "upcoming" ? upcoming : past;
  // Preview with "Show changes" on: events deleted since the live site, shown crossed out
  const ghosts = deletedEvents.filter((e) => (tab === "upcoming" ? e.date >= today : e.date < today)).map((e) => ({ ...e, isDeleted: true }));
  const list = sortEvents([...current, ...ghosts], tab === "upcoming" ? 1 : -1);

  return (
    <>
      <PageHeader title={content.settings.navEvents?.trim() || "Events"} intro="Prayer gatherings, classes, celebrations and more. Everyone is welcome." image={photoSrc(content, "ph10")} />
      <section className="section">
        <div className="container">
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            renderDay={(key) =>
              (byDate[key] || []).map((ev) => (
                <button key={ev.id} className={`cal-event ${key < today ? "is-past" : ""}`} onClick={(e) => { e.stopPropagation(); setOpenEvent(ev); }} title={ev.title}>
                  {ev.startTime && <span className="cal-event-time">{formatTime(ev.startTime)}</span>} {ev.title}
                </button>
              ))
            }
            dayProps={(key) => (byDate[key] ? { className: "has-events", onClick: () => setOpenEvent(byDate[key][0]) } : {})}
          />

          <div className="list-tabs" role="tablist">
            <button role="tab" aria-selected={tab === "upcoming"} className={tab === "upcoming" ? "active" : ""} onClick={() => setTab("upcoming")}>
              Upcoming events <span className="count">{upcoming.length}</span>
            </button>
            <button role="tab" aria-selected={tab === "past"} className={tab === "past" ? "active" : ""} onClick={() => setTab("past")}>
              Past events <span className="count">{past.length}</span>
            </button>
          </div>

          <div className="event-list">
            {list.length === 0 && (tab === "upcoming" ? <NoUpcoming /> : <p className="muted">No past events yet.</p>)}
            {list.map((ev) => {
              const d = fromKey(ev.date);
              if (ev.isDeleted) {
                return (
                  <div key={ev.id} className="event-row event-row-deleted">
                    <span className="date-block">
                      <small>{d.toLocaleDateString("en-US", { month: "short" })}</small>
                      <strong>{d.getDate()}</strong>
                      <small>{d.getFullYear()}</small>
                    </span>
                    <span className="event-row-img cover-framed" style={coverStyle(content, ev)} />
                    <span className="event-row-body">
                      <h3>{ev.title}</h3>
                      <span className="tag tag-deleted">Deleted, not published</span>
                    </span>
                  </div>
                );
              }
              const photoCount = galleryPhotos(content).filter((p) => p.eventId === ev.id).length;
              return (
                <button key={ev.id} className="event-row" onClick={() => setOpenEvent(ev)}>
                  <span className="date-block">
                    <small>{d.toLocaleDateString("en-US", { month: "short" })}</small>
                    <strong>{d.getDate()}</strong>
                    <small>{d.getFullYear()}</small>
                  </span>
                  <span className="event-row-img cover-framed" style={coverStyle(content, ev)} />
                  <span className="event-row-body">
                    <h3>{ev.title}</h3>
                    <span className="event-card-meta">
                      <Icon name="clock" /> {formatDate(ev.date, { weekday: "long" })}, {formatTimeRange(ev.startTime, ev.endTime)}
                      {ev.location && <><Icon name="pin" /> {ev.location}</>}
                    </span>
                    <span className="event-row-summary">{ev.summary}</span>
                    {tab === "past" && photoCount > 0 && <span className="tag">{photoCount} photos</span>}
                  </span>
                  <span className="event-row-arrow">›</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
      {openEvent && <EventModal event={openEvent} content={content} onClose={() => setOpenEvent(null)} />}
    </>
  );
}
