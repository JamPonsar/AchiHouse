// Member accounts: sign up, log in, profile, and the admin's tools for members.
//
//   Public:  POST /api/auth/signup · POST /api/auth/login · POST /api/auth/logout
//            GET /api/auth/me · PUT /api/auth/me · POST /api/auth/photo
//   Admin:   GET /api/admin/users          list members (never includes password hashes)
//            POST /api/admin/users         create a member (and optionally give them a membership)
//            PUT /api/admin/users/:id      set or remove a member's membership dates
//
// Passwords are never stored. Only a salted PBKDF2 hash is kept, which can't be turned back into
// the password, so nobody (including admins) can ever see a member's password.

export const USER_TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email TEXT NOT NULL UNIQUE COLLATE NOCASE,
     password_hash TEXT NOT NULL,
     first_name TEXT NOT NULL,
     last_name TEXT NOT NULL,
     phone TEXT, address TEXT, photo TEXT, bio TEXT, facebook TEXT, instagram TEXT,
     membership_purchased TEXT,
     membership_expires TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
];

// Columns that may leave the server. password_hash is deliberately not here.
const PUBLIC_COLUMNS =
  "id, email, first_name, last_name, phone, address, photo, bio, facebook, instagram, membership_purchased, membership_expires, created_at, updated_at";

const USER_COOKIE = "achi_user";
const USER_DAYS = 30;
const MAX_FAILS = 8;
const WINDOW_MIN = 15;
const ITERATIONS = 100000; // the most Cloudflare Workers allow
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHOTO_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const cleanDate = (v) => (typeof v === "string" && DATE_RE.test(v) && !Number.isNaN(Date.parse(v)) ? v : "");
// Letters and digits without look-alikes (no 0/O, 1/l/I), for passwords the admin hands to a member
const TEMP_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const tempPassword = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (n) => TEMP_CHARS[n % TEMP_CHARS.length]).join("");

// Membership dates from a request body. Both empty = no membership.
function readMembership(b) {
  const bought = cleanDate(b.membershipPurchased);
  const expires = cleanDate(b.membershipExpires);
  if (b.membershipExpires && !expires) return { error: "That end date isn't a valid date." };
  if (b.membershipPurchased && !bought) return { error: "That start date isn't a valid date." };
  if (!expires) return { purchased: null, expires: null };
  const start = bought || new Date().toISOString().slice(0, 10);
  if (expires < start) return { error: "The membership can't end before it starts." };
  return { purchased: start, expires };
}

const clean = (v, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const cleanUrl = (v) => {
  const s = clean(v, 300);
  return !s || /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone || "",
    address: row.address || "",
    photo: row.photo || "",
    bio: row.bio || "",
    facebook: row.facebook || "",
    instagram: row.instagram || "",
    membershipPurchased: row.membership_purchased || "",
    membershipExpires: row.membership_expires || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function makeUserHandlers(h) {
  const { json, error, enc, b64, checkPassword, hmacKey } = h;

  async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, key, 256);
    return `pbkdf2:${ITERATIONS}:${b64.encode(salt)}:${b64.encode(bits)}`;
  }
  // Used when the email doesn't exist, so a wrong email takes as long as a wrong password
  let dummyHash = null;

  async function makeToken(env, uid) {
    const payload = b64.encode(enc.encode(JSON.stringify({ t: "member", uid, exp: Date.now() + USER_DAYS * 86400000 })));
    const sig = await crypto.subtle.sign("HMAC", await hmacKey(env), enc.encode(payload));
    return `${payload}.${b64.encode(sig)}`;
  }
  async function readToken(request, env) {
    if (!env.SESSION_SECRET) return null;
    const found = (request.headers.get("cookie") || "").split(/;\s*/).find((c) => c.startsWith(USER_COOKIE + "="));
    if (!found) return null;
    const [payload, sig] = found.slice(USER_COOKIE.length + 1).split(".");
    if (!payload || !sig) return null;
    try {
      if (!(await crypto.subtle.verify("HMAC", await hmacKey(env), b64.decode(sig), enc.encode(payload)))) return null;
      const data = JSON.parse(new TextDecoder().decode(b64.decode(payload)));
      return data.t === "member" && data.exp > Date.now() && Number.isInteger(data.uid) ? data.uid : null;
    } catch {
      return null;
    }
  }
  const cookie = (value, maxAge, secure) =>
    `${USER_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;

  const getUser = (env, id) => env.DB.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`).bind(id).first();

  async function tooMany(env, key) {
    const since = new Date(Date.now() - WINDOW_MIN * 60000).toISOString();
    await env.DB.prepare("DELETE FROM login_attempts WHERE created_at < ?").bind(since).run();
    const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ?").bind(key).first();
    return r.n >= MAX_FAILS;
  }
  const note = (env, key) => env.DB.prepare("INSERT INTO login_attempts (ip, created_at) VALUES (?, ?)").bind(key, new Date().toISOString()).run();

  async function signedIn(env, uid, url, status = 200) {
    const token = await makeToken(env, uid);
    return json({ user: toUser(await getUser(env, uid)) }, status, { "set-cookie": cookie(token, USER_DAYS * 86400, url.protocol === "https:") });
  }

  // /api/auth/*
  async function handleAuth(request, env, url, sub, method) {
    if (!env.SESSION_SECRET) return error("Accounts aren't set up on this server yet.", 503);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";

    if (sub === "signup" && method === "POST") {
      if (await tooMany(env, `signup:${ip}`)) return error(`Too many sign-ups from here. Please try again in ${WINDOW_MIN} minutes.`, 429);
      const b = (await request.json().catch(() => null)) || {};
      if (b.website) return json({ ok: true }); // honeypot for bots
      const firstName = clean(b.firstName, 80), lastName = clean(b.lastName, 80);
      const email = clean(b.email, 200).toLowerCase();
      const password = typeof b.password === "string" ? b.password : "";
      if (!firstName || !lastName) return error("Please enter your first and last name.");
      if (!EMAIL_RE.test(email)) return error("Please enter a valid email address.");
      if (password.length < 8 || password.length > 200) return error("Your password needs at least 8 characters.");
      const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
      if (exists) return error("There's already an account with that email. Try logging in instead.", 409);
      await note(env, `signup:${ip}`); // counts toward the sign-up limit
      const now = new Date().toISOString();
      const res = await env.DB.prepare(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(email, await hashPassword(password), firstName, lastName, clean(b.phone, 50), now, now).run();
      return signedIn(env, res.meta.last_row_id, url, 201);
    }

    if (sub === "login" && method === "POST") {
      if (await tooMany(env, `user:${ip}`)) return error(`Too many wrong attempts. Please wait ${WINDOW_MIN} minutes and try again.`, 429);
      const b = (await request.json().catch(() => null)) || {};
      const email = clean(b.email, 200).toLowerCase();
      const password = typeof b.password === "string" ? b.password.slice(0, 200) : "";
      const row = await env.DB.prepare("SELECT id, password_hash FROM users WHERE email = ?").bind(email).first();
      if (!row && !dummyHash) dummyHash = await hashPassword("not-a-real-password");
      const ok = await checkPassword(password, row ? row.password_hash : dummyHash);
      if (!row || !ok) {
        await note(env, `user:${ip}`);
        return error("That email or password isn't right.", 401);
      }
      await env.DB.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(`user:${ip}`).run();
      return signedIn(env, row.id, url);
    }

    if (sub === "logout" && method === "POST") {
      return json({ ok: true }, 200, { "set-cookie": cookie("", 0, url.protocol === "https:") });
    }

    // Everything below needs a logged-in member
    const uid = await readToken(request, env);
    if (sub === "me" && method === "GET") return json({ user: uid ? toUser(await getUser(env, uid)) : null });
    if (!uid) return error("Please log in.", 401);

    if (sub === "me" && method === "PUT") {
      const b = (await request.json().catch(() => null)) || {};
      const firstName = clean(b.firstName, 80), lastName = clean(b.lastName, 80);
      if (!firstName || !lastName) return error("Please enter your first and last name.");
      await env.DB.prepare(
        `UPDATE users SET first_name = ?, last_name = ?, phone = ?, address = ?, bio = ?, facebook = ?, instagram = ?, updated_at = ? WHERE id = ?`
      ).bind(firstName, lastName, clean(b.phone, 50), clean(b.address, 300), clean(b.bio, 2000), cleanUrl(b.facebook), cleanUrl(b.instagram), new Date().toISOString(), uid).run();
      return json({ user: toUser(await getUser(env, uid)) });
    }

    if (sub === "photo" && method === "POST") {
      const type = (request.headers.get("content-type") || "").split(";")[0];
      if (!PHOTO_TYPES[type]) return error("Please choose a JPG, PNG or WebP picture.");
      const body = await request.arrayBuffer();
      if (body.byteLength > 5 * 1024 * 1024) return error("That picture is too big (5 MB max).");
      const key = `members/${uid}/${crypto.randomUUID()}.${PHOTO_TYPES[type]}`;
      await env.MEDIA.put(key, body, { httpMetadata: { contentType: type } });
      await env.DB.prepare("UPDATE users SET photo = ?, updated_at = ? WHERE id = ?").bind(`/media/${key}`, new Date().toISOString(), uid).run();
      return json({ user: toUser(await getUser(env, uid)) });
    }

    return error("Not found", 404);
  }

  // /api/admin/users[/:id] (the caller has already checked the admin login)
  async function handleAdminUsers(request, env, method, rest) {
    if (!rest) {
      if (method === "GET") {
        const { results } = await env.DB.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY created_at DESC`).all();
        return json(results.map(toUser));
      }
      if (method === "POST") {
        const b = (await request.json().catch(() => null)) || {};
        const firstName = clean(b.firstName, 80), lastName = clean(b.lastName, 80);
        const email = clean(b.email, 200).toLowerCase();
        if (!firstName || !lastName) return error("Please enter a first and last name.");
        if (!EMAIL_RE.test(email)) return error("Please enter a valid email address.");
        // No password given: make one. It's shown to the admin once, since it can't be looked up later.
        const given = typeof b.password === "string" ? b.password : "";
        if (given && (given.length < 8 || given.length > 200)) return error("The password needs at least 8 characters.");
        const password = given || tempPassword();
        const m = readMembership(b);
        if (m.error) return error(m.error);
        if (await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first()) {
          return error("There's already an account with that email.", 409);
        }
        const now = new Date().toISOString();
        const res = await env.DB.prepare(
          `INSERT INTO users (email, password_hash, first_name, last_name, phone, address, bio, facebook, instagram, membership_purchased, membership_expires, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(email, await hashPassword(password), firstName, lastName, clean(b.phone, 50), clean(b.address, 300), clean(b.bio, 2000), cleanUrl(b.facebook), cleanUrl(b.instagram), m.purchased, m.expires, now, now).run();
        const user = toUser(await getUser(env, res.meta.last_row_id));
        return json(given ? { user } : { user, temporaryPassword: password }, 201);
      }
      return error("Not found", 404);
    }

    const id = rest.startsWith("/") ? Number(rest.slice(1)) : NaN;
    if (!Number.isInteger(id)) return error("Not found", 404);

    if (method === "PUT") {
      if (!(await getUser(env, id))) return error("That member doesn't exist.", 404);
      const b = (await request.json().catch(() => null)) || {};
      const sets = [];
      const vals = [];

      // Membership dates (sent on their own from the membership box)
      if ("membershipPurchased" in b || "membershipExpires" in b) {
        const m = readMembership(b);
        if (m.error) return error(m.error);
        sets.push("membership_purchased = ?", "membership_expires = ?");
        vals.push(m.purchased, m.expires);
      }

      // Profile details (sent together from the edit form)
      if ("firstName" in b) {
        const firstName = clean(b.firstName, 80), lastName = clean(b.lastName, 80);
        const email = clean(b.email, 200).toLowerCase();
        if (!firstName || !lastName) return error("Please enter a first and last name.");
        if (!EMAIL_RE.test(email)) return error("Please enter a valid email address.");
        if (await env.DB.prepare("SELECT id FROM users WHERE email = ? AND id != ?").bind(email, id).first()) {
          return error("Another account already uses that email.", 409);
        }
        sets.push("first_name = ?", "last_name = ?", "email = ?", "phone = ?", "address = ?", "bio = ?", "facebook = ?", "instagram = ?");
        vals.push(firstName, lastName, email, clean(b.phone, 50), clean(b.address, 300), clean(b.bio, 2000), cleanUrl(b.facebook), cleanUrl(b.instagram));
      }

      if (!sets.length) return error("Nothing to change.");
      await env.DB.prepare(`UPDATE users SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`).bind(...vals, new Date().toISOString(), id).run();
      return json({ user: toUser(await getUser(env, id)) });
    }
    return error("Not found", 404);
  }

  // The logged-in member's account row (or null), for other parts of the server such as RSVPs
  async function currentUser(request, env) {
    const uid = await readToken(request, env);
    return uid ? getUser(env, uid) : null;
  }

  return { handleAuth, handleAdminUsers, currentUser };
}
