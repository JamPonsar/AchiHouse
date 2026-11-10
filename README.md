# Achi House Website

Website for **Achi House**, a Tibetan non-profit community center.

**Pages:** Home · About · Events · Photos · Renting · Contact · Donate

## Tech

| Part | What it uses |
| --- | --- |
| Front end | React + Vite |
| Back end | A Cloudflare Worker |
| Content and booking requests | Cloudflare **D1** (SQLite) |
| Uploaded photos | Cloudflare **R2** |

Page content is stored as a single JSON document in D1. A separate page, protected by an authorized login, lets the organization's staff manage the website's content on their own, without touching code.

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
