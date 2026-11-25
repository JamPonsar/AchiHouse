// Email the admin when a visitor sends a message or a space request, so it shows up as a
// notification on their phone.
//
// Uses the Resend email service (https://resend.com). Needs one secret, set on the Cloudflare Worker:
//   RESEND_API_KEY   (wrangler secret put RESEND_API_KEY)
// Optional settings (Worker variables), shown here with their defaults:
//   NOTIFY_TO    info@achihouse.org
//   NOTIFY_FROM  Achi House Website <notifications@achihouse.org>   (must be on a domain verified in Resend)
//
// Without RESEND_API_KEY nothing is sent (e.g. when running locally). Sending never blocks or breaks
// the visitor's request: it runs after the message is saved, and failures are only logged.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const oneLine = (s) => String(s || "").replace(/[\r\n]+/g, " ").trim();

function dayName(date) {
  const d = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

// The subject and plain-text body for a request, as saved by POST /api/requests
export function buildEmail(r, origin) {
  const isBooking = r.kind === "booking";
  const subject = isBooking
    ? `New space request from ${oneLine(r.name)}${r.date ? ` for ${dayName(r.date)}` : ""}`
    : `New message from ${oneLine(r.name)}`;

  const lines = [isBooking ? "Someone asked about renting the space." : "Someone sent a question.", ""];
  const add = (label, value) => { if (value) lines.push(`${label}: ${oneLine(value)}`); }; // one line each, so a field can't pose as another
  add("Name", r.name);
  add("Email", r.email);
  add("Phone", r.phone);
  if (isBooking) {
    add("Date", r.date && dayName(r.date));
    add("Time", [r.start_time, r.end_time].filter(Boolean).join(" to "));
    add("Guests", r.guests);
    add("Event type", r.event_type);
  }
  if (r.message) lines.push("", "Message:", r.message);
  lines.push("", "Reply to this email to answer them directly.", `See it in the inbox: ${origin}/admin/requests`);
  return { subject, text: lines.join("\n") };
}

export async function notifyNewRequest(env, r, origin) {
  if (!env.RESEND_API_KEY) return { sent: false, reason: "RESEND_API_KEY is not set" };
  const { subject, text } = buildEmail(r, origin);
  const body = {
    from: env.NOTIFY_FROM || "Achi House Website <notifications@achihouse.org>",
    to: [env.NOTIFY_TO || "info@achihouse.org"],
    subject,
    text,
  };
  // Replying goes straight to the visitor (only when what they typed looks like an email address)
  if (EMAIL_RE.test(r.email)) body.reply_to = r.email;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Email service said ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return { sent: true };
}
