// Adds pretend members to the LOCAL database, for trying out the profile and admin pages.
//   npm run seed:users
// Every mock member has an @example.com email and the password "Password123!".
// Running it again replaces the mock members (real accounts are never touched).
// It only ever writes to the local copy of the database, never to the live site.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { USER_TABLES } from "../worker/users.js";

const PASSWORD = "Password123!";
const b64 = (buf) => Buffer.from(buf).toString("base64url");
const hash = (pw) => {
  const salt = randomBytes(16);
  return `pbkdf2:100000:${b64(salt)}:${b64(pbkdf2Sync(pw, salt, 100000, 32, "sha256"))}`;
};
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const yearBefore = (key) => {
  const d = new Date(key + "T12:00:00");
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
};

// [first, last, phone, address, bio, membership expires in N days (null = no membership), joined N days ago]
const PEOPLE = [
  ["Tenzin", "Dolma", "(917) 555-0101", "41-12 75th St, Elmhurst, NY 11373", "Volunteer at Losar every year. Loves cooking momos for the community.", 12, 400],
  ["Karma", "Wangchuk", "(646) 555-0102", "", "Teaches the Saturday Tibetan language class.", 25, 380],
  ["Pema", "Lhamo", "(347) 555-0103", "88-20 Queens Blvd, Elmhurst, NY 11373", "", 47, 350],
  ["Sonam", "Tsering", "(718) 555-0104", "", "Member since the center opened.", 60, 520],
  ["Dawa", "Norbu", "(929) 555-0105", "", "", 95, 300],
  ["Yangchen", "Kyi", "(917) 555-0106", "37-10 82nd St, Jackson Heights, NY 11372", "Dancer and choreographer for our cultural performances.", 130, 260],
  ["Lobsang", "Gyatso", "(646) 555-0107", "", "", 190, 200],
  ["Dechen", "Choedon", "(347) 555-0108", "", "Helps organize the youth program.", 280, 120],
  ["Ngawang", "Tashi", "(718) 555-0109", "", "", 330, 40],
  ["Kunga", "Dorjee", "(929) 555-0110", "", "", -20, 420],
  ["Jamyang", "Sherab", "(917) 555-0111", "", "Monthly prayer regular.", -150, 600],
  ["Rinchen", "Palmo", "(646) 555-0112", "", "", null, 90],
  ["Tsewang", "Rigzin", "", "", "", null, 30],
  ["Choying", "Drolma", "(347) 555-0114", "", "", null, 5],
];

const q = (v) => (v === null || v === undefined || v === "" ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const rows = PEOPLE.map(([first, last, phone, address, bio, expiresIn, joinedAgo], i) => {
  const email = `${first}.${last}`.toLowerCase() + "@example.com";
  const expires = expiresIn === null ? null : day(expiresIn);
  const created = new Date(Date.now() - joinedAgo * 86400000).toISOString();
  const handle = `${first}${last}`.toLowerCase();
  return `INSERT INTO users (email, password_hash, first_name, last_name, phone, address, photo, bio, facebook, instagram, membership_purchased, membership_expires, created_at, updated_at) VALUES (${[
    email, hash(PASSWORD), first, last, phone, address, null, bio,
    i % 3 === 0 ? `https://www.facebook.com/${handle}` : "", i % 2 === 0 ? `https://www.instagram.com/${handle}` : "",
    expires && yearBefore(expires), expires, created, created,
  ].map(q).join(", ")});`;
});

const sql = [
  ...USER_TABLES.map((t) => t.replace(/\s+/g, " ") + ";"),
  "DELETE FROM users WHERE email LIKE '%@example.com';",
  ...rows,
].join("\n");

mkdirSync(".wrangler", { recursive: true });
writeFileSync(".wrangler/mock-users.sql", sql);
// On Windows, npx is a .cmd file, which needs a shell to start
execFileSync("npx", ["wrangler", "d1", "execute", "achihouse-db", "--local", "--file=.wrangler/mock-users.sql"], { stdio: "inherit", shell: process.platform === "win32" });
console.log(`\nAdded ${PEOPLE.length} mock members to the LOCAL database. Log in with any of them, e.g. tenzin.dolma@example.com / ${PASSWORD}`);
