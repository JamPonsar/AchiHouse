// RSVPs: people tell Achi House they plan to come to an event, and how many guests they'll bring.
// Nobody needs to RSVP to attend; it only helps with planning.
//
//   Public:  GET    /api/rsvps/counts          people planning to attend, for every event
//            GET    /api/events/:id/rsvp       counts for one event, plus the logged-in member's own RSVP
//            POST   /api/events/:id/rsvp       RSVP (as a logged-in member, or as a guest with name/email/phone)
//            DELETE /api/events/:id/rsvp       cancel (members only)
//   Admin:   GET    /api/admin/rsvps?event=ID  who is coming to an event
//            GET    /api/admin/rsvps/summary   people planning to attend, per event
//            DELETE /api/admin/rsvps/:id       remove one RSVP
//
// "People" always means the person who RSVP'd plus the guests they said they'd bring.

import { eventEnd } from "../src/lib/dates.js";

export const RSVP_TABLES = [
  `CREATE TABLE IF NOT EXISTS rsvps (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     event_id TEXT NOT NULL,
     user_id INTEGER,
     name TEXT NOT NULL,
     email TEXT NOT NULL COLLATE NOCASE,
     phone TEXT,
     guests INTEGER NOT NULL DEFAULT 0,
     guest_names TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     UNIQUE (event_id, email)
   )`,
];

const MAX_GUESTS = 20;
const WINDOW_MIN = 15;
const MAX_TRIES = 20;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EVENT_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

const clean = (v, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
// Today's date where the events are (New York), as YYYY-MM-DD
const newYorkToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());

const toRsvp = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone || "",
  guests: row.guests,
  guestNames: row.guest_names || "",
  isMember: row.user_id != null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function makeRsvpHandlers({ json, error, currentUser, getEvent }) {
  async function totals(env, eventId) {
    const t = await env.DB.prepare(
      "SELECT COUNT(*) AS going, COALESCE(SUM(1 + guests), 0) AS people FROM rsvps WHERE event_id = ?"
    ).bind(eventId).first();
    return { going: t.going, people: t.people };
  }

  async function mineFor(env, eventId, user) {
    if (!user) return null;
    const row = await env.DB.prepare("SELECT * FROM rsvps WHERE event_id = ? AND (user_id = ? OR email = ?)")
      .bind(eventId, user.id, user.email).first();
    return row ? { guests: row.guests, guestNames: row.guest_names || "" } : null;
  }

  // GET /api/rsvps/counts
  async function counts(env) {
    const { results } = await env.DB.prepare("SELECT event_id, SUM(1 + guests) AS people FROM rsvps GROUP BY event_id").all();
    return json(Object.fromEntries(results.map((r) => [r.event_id, r.people])), 200, { "cache-control": "no-cache" });
  }

  // /api/events/:id/rsvp
  async function handleEvent(request, env, eventId, method) {
    if (!EVENT_ID_RE.test(eventId)) return error("Not found", 404);
    const user = await currentUser(request, env);

    if (method === "GET") {
      return json({ ...(await totals(env, eventId)), mine: await mineFor(env, eventId, user) }, 200, { "cache-control": "no-cache" });
    }

    if (method === "DELETE") {
      if (!user) return error("Please log in to cancel your RSVP.", 401);
      await env.DB.prepare("DELETE FROM rsvps WHERE event_id = ? AND (user_id = ? OR email = ?)").bind(eventId, user.id, user.email).run();
      return json({ ...(await totals(env, eventId)), mine: null });
    }

    if (method !== "POST") return error("Not found", 404);

    const b = (await request.json().catch(() => null)) || {};
    if (b.website) return json({ ok: true }); // honeypot: bots fill hidden fields

    // Only events on the live website, and only ones that haven't finished
    const event = await getEvent(env, eventId);
    if (!event) return error("This event isn't open for RSVPs.", 404);
    if (eventEnd(event) < newYorkToday()) return error("This event has already happened.");

    // A few RSVPs per visitor, so nobody can flood the list
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const key = `rsvp:${ip}`;
    const since = new Date(Date.now() - WINDOW_MIN * 60000).toISOString();
    await env.DB.prepare("DELETE FROM login_attempts WHERE created_at < ?").bind(since).run();
    const tries = await env.DB.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ?").bind(key).first();
    if (tries.n >= MAX_TRIES) return error(`That's a lot of RSVPs. Please try again in ${WINDOW_MIN} minutes.`, 429);
    await env.DB.prepare("INSERT INTO login_attempts (ip, created_at) VALUES (?, ?)").bind(key, new Date().toISOString()).run();

    const guests = Math.max(0, Math.min(MAX_GUESTS, Math.floor(Number(b.guests)) || 0));
    const guestNames = guests > 0 ? clean(b.guestNames, 300) : "";

    // Who is coming: the logged-in member, or a guest who filled in the form
    let who;
    if (user) {
      who = { name: `${user.first_name} ${user.last_name}`.trim(), email: user.email, phone: user.phone || "", userId: user.id };
    } else {
      who = { name: clean(b.name, 120), email: clean(b.email, 200).toLowerCase(), phone: clean(b.phone, 50), userId: null };
      if (!who.name) return error("Please enter your name.");
      if (!EMAIL_RE.test(who.email)) return error("Please enter a valid email address.");
      if (who.phone.replace(/\D/g, "").length < 7) return error("Please enter a phone number.");
    }

    const existing = await env.DB.prepare(
      who.userId ? "SELECT id FROM rsvps WHERE event_id = ? AND (user_id = ? OR email = ?)" : "SELECT id FROM rsvps WHERE event_id = ? AND email = ?"
    ).bind(...(who.userId ? [eventId, who.userId, who.email] : [eventId, who.email])).first();

    const now = new Date().toISOString();
    if (existing) {
      await env.DB.prepare("UPDATE rsvps SET user_id = ?, name = ?, email = ?, phone = ?, guests = ?, guest_names = ?, updated_at = ? WHERE id = ?")
        .bind(who.userId, who.name, who.email, who.phone, guests, guestNames, now, existing.id).run();
    } else {
      await env.DB.prepare(
        "INSERT INTO rsvps (event_id, user_id, name, email, phone, guests, guest_names, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(eventId, who.userId, who.name, who.email, who.phone, guests, guestNames, now, now).run();
    }
    return json({ ok: true, updated: !!existing, ...(await totals(env, eventId)), mine: { guests, guestNames } }, existing ? 200 : 201);
  }

  // /api/admin/rsvps... (the caller has already checked the admin login)
  async function handleAdmin(env, url, method, rest) {
    if (method === "GET" && rest === "/summary") {
      const { results } = await env.DB.prepare(
        "SELECT event_id, COUNT(*) AS going, SUM(1 + guests) AS people FROM rsvps GROUP BY event_id"
      ).all();
      return json(Object.fromEntries(results.map((r) => [r.event_id, { going: r.going, people: r.people }])));
    }
    if (method === "GET" && !rest) {
      const eventId = url.searchParams.get("event") || "";
      if (!EVENT_ID_RE.test(eventId)) return error("Choose an event.");
      const { results } = await env.DB.prepare("SELECT * FROM rsvps WHERE event_id = ? ORDER BY created_at ASC").bind(eventId).all();
      return json({ ...(await totals(env, eventId)), rsvps: results.map(toRsvp) });
    }
    const id = rest.startsWith("/") ? Number(rest.slice(1)) : NaN;
    if (method === "DELETE" && Number.isInteger(id)) {
      await env.DB.prepare("DELETE FROM rsvps WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }
    return error("Not found", 404);
  }

  return { counts, handleEvent, handleAdmin };
}
