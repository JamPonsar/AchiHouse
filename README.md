# Achi House Website

Website for **Achi House**, a Tibetan non-profit community center.

**Live site:** [achihouse.org](https://achihouse.org)

**Pages:** Home · About · Events · Photos · Renting · Contact · Donate

## Tech

| Part | What it uses |
| --- | --- |
| Front end | React + Vite |
| Back end | A Cloudflare Worker |
| Content and booking requests | Cloudflare **D1** (SQLite) |
| Uploaded photos | Cloudflare **R2** |

Page content is stored as a single JSON document in D1. A separate page, protected by an authorized login, lets the organization's staff manage the website's content on their own, without touching code.

## Member accounts

Visitors can sign up and log in (**Log in** at the end of the menu), and see and edit their profile at `/profile`. Admins see everyone under **Admin → Users** (all users, plus a **Memberships** view grouped by expiration month).

- Stored in the same D1 database, in a `users` table that is created automatically.
- Passwords are never stored, only a salted PBKDF2 hash (like the admin password), so nobody, including admins, can see them.
- The admin list never includes password hashes. Members can only read and change their own account.
- Login is limited to 8 wrong tries per 15 minutes from one location.
- Profile photos are stored in R2 under `members/`.

**Mock members (local only):** `npm run seed:users` adds 14 pretend members to your *local* database (password `Password123!`, emails `@example.com`). It never touches the live site.

## Project layout

```
worker/       Back-end API
scripts/      Maintenance scripts
src/
  data/       Starter content
  pages/      Public pages
  components/ Shared pieces: header/footer, calendar, slideshow, popups
  lib/        Helpers
public/       Static assets and starter photos
```
