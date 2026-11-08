// Makes the salted password hash that the website's login checks against.
//   read -s ADMIN_PASSWORD; export ADMIN_PASSWORD; node scripts/hash-password.mjs
// The password itself is never stored anywhere; only this hash is.
import { pbkdf2Sync, randomBytes } from "node:crypto";

const password = process.env.ADMIN_PASSWORD;
if (!password) {
  console.error("Set ADMIN_PASSWORD first. See README → Admin login.");
  process.exit(1);
}
const ITERATIONS = 100000; // the maximum Cloudflare Workers allows
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");
const b64url = (b) => b.toString("base64url");
console.log(`pbkdf2:${ITERATIONS}:${b64url(salt)}:${b64url(hash)}`);
