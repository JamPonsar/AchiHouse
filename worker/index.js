// Cloudflare Worker: the small "back end" for the Achi House website.
//
//   Public:  GET  /api/content          → the published website content
//            GET  /api/availability     → dates already booked / pending
//            POST /api/requests         → booking request or question from a visitor
//            GET  /media/<key>          → a photo uploaded through /admin
//
//   Admin (login required):
//            POST /api/admin/login, /logout · GET /api/admin/session
//            GET/PUT/DELETE /api/admin/draft     → load / save / discard unpublished edits
//            POST /api/admin/publish             → make the draft live + record history
//            GET  /api/admin/history[/:id]       → list past publishes / load one version
//            POST /api/admin/history/:id/restore → copy an old version into the draft
//            POST /api/admin/upload              → upload a photo
//            GET  /api/admin/requests, PATCH /api/admin/requests/:id
//
// Everything else is served from the built React app (see wrangler.jsonc).

import { seedContent } from "../src/data/seed.js";

let initialized = false;

async function init(env) {
  if (initialized) return;
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS site_state (
         key TEXT PRIMARY KEY,
         data TEXT NOT NULL,
         updated_at TEXT NOT NULL
       )`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS history (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         created_at TEXT NOT NULL,
         author TEXT,
         note TEXT,
         changes TEXT NOT NULL,
         snapshot TEXT NOT NULL
       )`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS requests (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         created_at TEXT NOT NULL,
         kind TEXT NOT NULL,
         name TEXT, email TEXT, phone TEXT,
         date TEXT, start_time TEXT, end_time TEXT,
         guests TEXT, event_type TEXT, message TEXT,
         status TEXT NOT NULL DEFAULT 'new'
       )`
    ),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT NOT NULL, created_at TEXT NOT NULL)`),
  ]);
  const existing = await env.DB.prepare("SELECT key FROM site_state WHERE key = 'published'").first();
  if (!existing) {
    const now = new Date().toISOString();
    const data = JSON.stringify(seedContent);
    await env.DB.batch([
      env.DB.prepare("INSERT INTO site_state (key, data, updated_at) VALUES ('published', ?, ?)").bind(data, now),
      env.DB.prepare(
        "INSERT INTO history (created_at, author, note, changes, snapshot) VALUES (?, ?, ?, ?, ?)"
      ).bind(now, "System", "Website created with starter content", "[]", data),
    ]);
  }
  initialized = true;
}

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

const error = (message, status = 400) => json({ error: message }, status);

async function getState(env, key) {
  const row = await env.DB.prepare("SELECT data, updated_at FROM site_state WHERE key = ?").bind(key).first();
  return row ? { data: JSON.parse(row.data), updatedAt: row.updated_at } : null;
}

// ── Admin sign-in ────────────────────────────────────────────────────────
// Three secrets are needed (set in Cloudflare, or in .dev.vars locally; they are
// never stored in the code or the repo):
//   ADMIN_USERNAME        the login name
//   ADMIN_PASSWORD_HASH   salted hash made by scripts/hash-password.mjs (not the password)
//   SESSION_SECRET        a long random string used to sign login cookies
// If any is missing, login is refused (fails closed). See README → Admin login.
const SESSION_COOKIE = "achi_session";
const SESSION_DAYS = 7;
const MAX_FAILS = 5; // wrong guesses allowed per visitor (IP address) ...
const WINDOW_MIN = 15; // ... every 15 minutes

const enc = new TextEncoder();
const b64 = {
  encode: (buf) =>
    btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  decode: (str) => {
    const s = str.replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(atob(s + "=".repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));
  },
};

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Compare two strings in constant time by comparing their SHA-256 digests
async function sameText(a, b) {
  const [x, y] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  return safeEqual(new Uint8Array(x), new Uint8Array(y));
}

async function checkPassword(password, stored) {
  const [scheme, iterations, salt, hash] = (stored || "").split(":");
  if (scheme !== "pbkdf2" || !iterations || !salt || !hash) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: b64.decode(salt), iterations: Number(iterations) }, key, 256)
  );
  return safeEqual(derived, b64.decode(hash));
}

const hmacKey = (env) =>
  crypto.subtle.importKey("raw", enc.encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

async function makeSession(env, user) {
  const payload = b64.encode(enc.encode(JSON.stringify({ u: user, exp: Date.now() + SESSION_DAYS * 86400000 })));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(env), enc.encode(payload));
  return `${payload}.${b64.encode(sig)}`;
}

// Returns { name } if the request carries a valid, unexpired login cookie
async function readSession(request, env) {
  if (!env.SESSION_SECRET || !env.ADMIN_USERNAME) return null;
  const found = (request.headers.get("cookie") || "").split(/;\s*/).find((c) => c.startsWith(SESSION_COOKIE + "="));
  if (!found) return null;
  const [payload, sig] = found.slice(SESSION_COOKIE.length + 1).split(".");
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(env), b64.decode(sig), enc.encode(payload));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(b64.decode(payload)));
    if (!data.exp || data.exp < Date.now() || data.u !== env.ADMIN_USERNAME) return null;
    return { name: data.u };
  } catch {
    return null;
  }
}

const sessionCookie = (value, maxAge, secure) =>
  `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;

async function handleLogin(request, env, url) {
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD_HASH || !env.SESSION_SECRET) {
    return error("Admin login isn't set up on this server yet.", 503);
  }
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const since = new Date(Date.now() - WINDOW_MIN * 60000).toISOString();
  await env.DB.prepare("DELETE FROM login_attempts WHERE created_at < ?").bind(since).run();
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ?").bind(ip).first();
  if (recent.n >= MAX_FAILS) return error(`Too many wrong attempts. Please wait ${WINDOW_MIN} minutes and try again.`, 429);

  const body = (await request.json().catch(() => null)) || {};
  // Always check both, so the response time doesn't reveal which one was wrong
  const userOk = await sameText(String(body.username || "").trim(), env.ADMIN_USERNAME);
  const passOk = await checkPassword(String(body.password || "").slice(0, 200), env.ADMIN_PASSWORD_HASH);
  if (!userOk || !passOk) {
    await env.DB.prepare("INSERT INTO login_attempts (ip, created_at) VALUES (?, ?)").bind(ip, new Date().toISOString()).run();
    return error("That username or password isn't right.", 401);
  }
  await env.DB.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
  const token = await makeSession(env, env.ADMIN_USERNAME);
  return json({ ok: true, name: env.ADMIN_USERNAME }, 200, {
    "set-cookie": sessionCookie(token, SESSION_DAYS * 86400, url.protocol === "https:"),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // Uploaded photos (stored in R2)
      if (path.startsWith("/media/") && method === "GET") {
        const key = decodeURIComponent(path.slice("/media/".length));
        const obj = await env.MEDIA.get(key);
        if (!obj) return new Response("Not found", { status: 404 });
        const headers = new Headers();
        obj.writeHttpMetadata(headers);
        headers.set("etag", obj.httpEtag);
        headers.set("cache-control", "public, max-age=31536000, immutable");
        return new Response(obj.body, { headers });
      }

      if (!path.startsWith("/api/")) return new Response("Not found", { status: 404 });

      await init(env);

      // ── Public API ───────────────────────────────────────────────────
      if (path === "/api/content" && method === "GET") {
        const published = await getState(env, "published");
        return json(published.data, 200, { "cache-control": "no-cache" });
      }

      if (path === "/api/availability" && method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT date, status FROM requests WHERE kind = 'booking' AND date IS NOT NULL AND status IN ('approved','new','read')"
        ).all();
        return json({
          booked: results.filter((r) => r.status === "approved").map((r) => r.date),
          pending: results.filter((r) => r.status !== "approved").map((r) => r.date),
        });
      }

      if (path === "/api/requests" && method === "POST") {
        const body = await request.json().catch(() => null);
        if (!body) return error("Invalid request");
        if (body.website) return json({ ok: true }); // honeypot: bots fill hidden fields
        const clean = (v, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
        const r = {
          kind: body.kind === "question" ? "question" : "booking",
          name: clean(body.name, 200),
          email: clean(body.email, 200),
          phone: clean(body.phone, 50),
          date: /^\d{4}-\d{2}-\d{2}$/.test(body.date || "") ? body.date : null,
          start_time: clean(body.startTime, 10),
          end_time: clean(body.endTime, 10),
          guests: clean(body.guests, 20),
          event_type: clean(body.eventType, 200),
          message: clean(body.message, 5000),
        };
        if (!r.name || !r.email) return error("Please include your name and email.");
        if (r.kind === "booking" && !r.date) return error("Please choose a date.");
        await env.DB.prepare(
          `INSERT INTO requests (created_at, kind, name, email, phone, date, start_time, end_time, guests, event_type, message)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(new Date().toISOString(), r.kind, r.name, r.email, r.phone, r.date, r.start_time, r.end_time, r.guests, r.event_type, r.message)
          .run();
        return json({ ok: true });
      }

      // ── Admin API ────────────────────────────────────────────────────
      if (path.startsWith("/api/admin/")) {
        const sub = path.slice("/api/admin/".length);
        if (sub === "login" && method === "POST") return handleLogin(request, env, url);
        if (sub === "logout" && method === "POST") {
          return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0, url.protocol === "https:") });
        }
        // Everything below requires being signed in
        const admin = await readSession(request, env);
        if (!admin) return error("Please sign in.", 401);
        if (sub === "session") return json({ ok: true, name: admin.name });

        if (sub === "draft") {
          if (method === "GET") {
            const published = await getState(env, "published");
            const draft = await getState(env, "draft");
            return json({
              published: published.data,
              draft: draft ? draft.data : null,
              draftUpdatedAt: draft ? draft.updatedAt : null,
            });
          }
          if (method === "PUT") {
            const data = await request.json();
            await env.DB.prepare(
              "INSERT INTO site_state (key, data, updated_at) VALUES ('draft', ?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
            )
              .bind(JSON.stringify(data), new Date().toISOString())
              .run();
            return json({ ok: true });
          }
          if (method === "DELETE") {
            await env.DB.prepare("DELETE FROM site_state WHERE key = 'draft'").run();
            return json({ ok: true });
          }
        }

        if (sub === "publish" && method === "POST") {
          const { note = "", changes = [] } = (await request.json().catch(() => ({}))) || {};
          const draft = await getState(env, "draft");
          if (!draft) return error("There are no changes to publish.");
          const now = new Date().toISOString();
          const data = JSON.stringify(draft.data);
          await env.DB.batch([
            env.DB.prepare("UPDATE site_state SET data = ?, updated_at = ? WHERE key = 'published'").bind(data, now),
            env.DB.prepare("DELETE FROM site_state WHERE key = 'draft'"),
            env.DB.prepare(
              "INSERT INTO history (created_at, author, note, changes, snapshot) VALUES (?, ?, ?, ?, ?)"
            ).bind(now, admin.name, String(note).slice(0, 500), JSON.stringify(changes).slice(0, 20000), data),
          ]);
          return json({ ok: true, published: draft.data });
        }

        if (sub === "history" && method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT id, created_at, author, note, changes FROM history ORDER BY id DESC LIMIT 200"
          ).all();
          return json(results.map((r) => ({ ...r, changes: JSON.parse(r.changes || "[]") })));
        }

        let m;
        if ((m = sub.match(/^history\/(\d+)$/)) && method === "GET") {
          const row = await env.DB.prepare("SELECT snapshot FROM history WHERE id = ?").bind(m[1]).first();
          if (!row) return error("Version not found", 404);
          return json(JSON.parse(row.snapshot));
        }

        if ((m = sub.match(/^history\/(\d+)\/restore$/)) && method === "POST") {
          const row = await env.DB.prepare("SELECT snapshot FROM history WHERE id = ?").bind(m[1]).first();
          if (!row) return error("Version not found", 404);
          await env.DB.prepare(
            "INSERT INTO site_state (key, data, updated_at) VALUES ('draft', ?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
          )
            .bind(row.snapshot, new Date().toISOString())
            .run();
          return json({ ok: true, draft: JSON.parse(row.snapshot) });
        }

        if (sub === "upload" && method === "POST") {
          const type = request.headers.get("content-type") || "";
          if (!type.startsWith("image/")) return error("Only image files can be uploaded.");
          if (Number(request.headers.get("content-length") || 0) > 12e6) return error("That photo is too large (12 MB max).");
          const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[type] || "img";
          const key = `uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
          await env.MEDIA.put(key, request.body, { httpMetadata: { contentType: type } });
          return json({ src: `/media/${key}` });
        }

        if (sub === "requests" && method === "GET") {
          const { results } = await env.DB.prepare("SELECT * FROM requests ORDER BY id DESC LIMIT 500").all();
          return json(results);
        }

        if ((m = sub.match(/^requests\/(\d+)$/)) && method === "PATCH") {
          const { status } = await request.json();
          if (!["new", "read", "approved", "declined", "archived"].includes(status)) return error("Bad status");
          await env.DB.prepare("UPDATE requests SET status = ? WHERE id = ?").bind(status, m[1]).run();
          return json({ ok: true });
        }
      }

      return error("Not found", 404);
    } catch (err) {
      console.error(err);
      return error("Something went wrong on the server.", 500);
    }
  },
};
