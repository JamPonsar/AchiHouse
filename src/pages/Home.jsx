import { useState } from "react";
import { Link } from "react-router-dom";
import Slideshow from "../components/Slideshow.jsx";
import Text from "../components/Text.jsx";
import NoUpcoming from "../components/NoUpcoming.jsx";
import EventModal, { Icon } from "../components/EventModal.jsx";
import { coverStyle, useContent, photoSrc } from "../lib/content.jsx";
import { formatDate, formatTimeRange, fromKey, sortEvents, todayKey } from "../lib/dates.js";

export default function Home() {
  const { content } = useContent();
  const { home } = content;
  const [openEvent, setOpenEvent] = useState(null);
  const slides = home.slides.map((id) => photoSrc(content, id)).filter(Boolean);
  const upcoming = sortEvents(content.events.filter((e) => e.date >= todayKey())).slice(0, 3);

  return (
    <>
      <Slideshow images={slides}>
        <p className="hero-greeting">{home.greeting}</p>
        <h1>{home.heroTitle}</h1>
        <p className="hero-sub">{home.heroSubtitle}</p>
        <div className="hero-actions">
          <Link to="/events" className="btn btn-gold">See upcoming events</Link>
          <Link to="/about" className="btn btn-light">About us</Link>
        </div>
      </Slideshow>

      <section className="section">
        <div className="container split">
          <div>
            <p className="eyebrow">About Achi House</p>
            <h2>{home.introHeading}</h2>
            <Text className="prose">{home.introText}</Text>
            <Link to="/about" className="text-link">Learn more about us →</Link>
          </div>
          {home.introPhoto && (
            <div className="framed-photo"><img src={photoSrc(content, home.introPhoto)} alt="" /></div>
          )}
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <div className="highlights">
            {home.highlights.map((h, i) => (
              <div key={h.id} className="highlight">
                <span className={`highlight-dot c${i % 5}`} />
                <h3>{h.title}</h3>
                <p>{h.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">What's happening</p>
              <h2>Upcoming Events</h2>
            </div>
            <Link to="/events" className="text-link">View full calendar →</Link>
          </div>
          {upcoming.length === 0 ? (
            <NoUpcoming />
          ) : (
            <div className="event-cards">
              {upcoming.map((ev) => {
                const d = fromKey(ev.date);
                return (
                  <button key={ev.id} className="event-card" onClick={() => setOpenEvent(ev)}>
                    <div className="event-card-img cover-framed" style={coverStyle(content, ev)}>
                      <span className="date-badge">
                        <small>{d.toLocaleDateString("en-US", { month: "short" })}</small>
                        {d.getDate()}
                      </span>
                    </div>
                    <div className="event-card-body">
                      <h3>{ev.title}</h3>
                      <p className="event-card-meta"><Icon name="clock" />{formatDate(ev.date, { weekday: "short", month: "short", day: "numeric" })} · {formatTimeRange(ev.startTime, ev.endTime)}</p>
                      <p>{ev.summary}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-grid">
          <div className="cta">
            <h3>Host your event at Achi House</h3>
            <p>Celebrations, memorials, classes and meetings. Our hall is open to the community.</p>
            <Link to="/book" className="btn btn-light">Check availability</Link>
          </div>
          <div className="cta">
            <h3>Support our community</h3>
            <p>Achi House is run by volunteers and funded by people like you.</p>
            <Link to="/donate" className="btn btn-gold">Donate</Link>
          </div>
        </div>
      </section>

      {openEvent && <EventModal event={openEvent} content={content} onClose={() => setOpenEvent(null)} />}
    </>
  );
}
