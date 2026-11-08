# Achi House Website

Website for **Achi House**, a Tibetan non-profit community center. It has a public site, plus an editor at **`/admin`** where the organization can change text, photos, events and more without touching code.

- **Public pages:** Home · About · Events · Photos · Book the Space · Contact · Donate
- **Admin (`/admin`):** edits are saved automatically as a private *draft*. Nothing changes on the live site until you click **Publish changes**. Every publish is saved in **Edit history** and can be restored.

## Tech

| Part | What it uses |
| --- | --- |
| Front end | React + Vite (`src/`) |
| Back end | A Cloudflare Worker (`worker/index.js`) |
| Content, drafts, history, booking requests | Cloudflare **D1** (SQLite) |
| Photos uploaded through `/admin` | Cloudflare **R2** |
| Starter photos | `public/photos/` (web-sized copies of `Photos/`) |

All page content lives in one JSON document. It is seeded from `src/data/seed.js` the first time the site runs; after that, `/admin` is the place to edit it. The database tables are created automatically, so there are no migrations to run.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173  (admin: http://localhost:5173/admin)
```

`npm run dev` runs the real Worker locally, along with a simulated D1 database and R2 bucket (stored in `.wrangler/`). To reset the local data back to the starter content, stop the server and delete `.wrangler/state`.

## Deploying to Cloudflare

One-time setup:

```bash
npx wrangler login
npx wrangler d1 create achihouse-db         # copy the database_id it prints into wrangler.jsonc
npx wrangler r2 bucket create achihouse-media   # R2 must be enabled once in the Cloudflare dashboard first
```

Then deploy:

```bash
npm run deploy     # builds the site and runs `wrangler deploy`
```

**Or deploy automatically from GitHub:** in the Cloudflare dashboard, go to *Workers & Pages → Create → Import a repository*, pick this repo, and use build command `npm run build` and deploy command `npx wrangler deploy`. Every push to `main` then redeploys.

## Admin login

`/admin` requires a username and password. The check happens **on the server**, so the editing API can't be used without signing in.

- The password is **never stored in the code or on GitHub**. Only a salted hash of it is kept, as a Cloudflare *secret*.
- Sign-in sets a cookie that can't be read by scripts (HttpOnly, SameSite=Strict, HTTPS-only in production). It lasts 7 days; **Sign out** is at the bottom of the left menu.
- After 5 wrong guesses from one location, sign-in is blocked for 15 minutes.
- `/admin` is hidden from search engines (a `noindex` header and tag), isn't linked from the public site, and isn't listed in `robots.txt`.

### Local development
`.dev.vars` (git-ignored) holds the three secrets. If it's missing, create it:

```bash
read -s ADMIN_PASSWORD; export ADMIN_PASSWORD          # type the password (it isn't shown)
HASH=$(node scripts/hash-password.mjs); unset ADMIN_PASSWORD
printf 'ADMIN_USERNAME="your-username"\nADMIN_PASSWORD_HASH="%s"\nSESSION_SECRET="%s"\n' "$HASH" "$(openssl rand -hex 32)" > .dev.vars
```

### Production (Cloudflare)
Add the same three values as secrets. Use a **new** `SESSION_SECRET` (any long random string):

```bash
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD_HASH     # paste the "pbkdf2:100000:…" line from .dev.vars
npx wrangler secret put SESSION_SECRET
```
(Or in the dashboard: Workers & Pages → achihouse → Settings → Variables and Secrets.) Until these are set, login is refused.

**Changing the password:** make a new hash as above and update `ADMIN_PASSWORD_HASH`. **Signing everyone out:** change `SESSION_SECRET`.

### Optional extra layer: two-step sign-in with Cloudflare Access
For protection beyond a password, add **Cloudflare Access** (free for up to 50 users): Zero Trust → Access → Applications → Self-hosted → protect `/admin` and `/api/admin`, with an email allow-list. Visitors must then enter a code emailed to them *before* even seeing the login page.

## Project layout

```
worker/index.js        API: content, login, drafts, publish, history, uploads, booking requests
scripts/               hash-password.mjs (makes the password hash for the login)
src/data/seed.js       Starter content (placeholder text)
src/pages/             Public pages
src/components/        Shared pieces: header/footer, calendar, slideshow, popups
src/admin/             The /admin editor
  AdminApp.jsx         Draft / autosave / preview / publish logic
  fields.jsx           Form fields, photo picker, upload area
  sections/            One editor per page, plus inbox and history
src/lib/diff.js        Turns edits into plain-English change lists ("Added event …")
```
