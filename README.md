# MoveMate — full-stack moving services website

A responsive MoveMate marketing site based on the supplied HTML, now connected to an Express API and SQLite database. Quote requests submitted on the website are validated and persisted instead of being accepted by a front-end-only demo.

## Features

- Existing MoveMate landing-page design, mobile navigation, scroll reveals and quote form.
- `POST /api/quotes` validates and stores quote enquiries in SQLite.
- `GET /api/health` health check.
- Token-protected admin endpoints to list enquiries and change their status.
- Private admin page at `/admin.html`.
- Helmet security headers, JSON body size limit, request rate limiting and server-side validation.
- Dockerfile, Render blueprint and GitHub Actions CI workflow.

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
cp .env.example .env
# Edit .env and set a long random ADMIN_TOKEN
npm install
npm start
```

Open <http://localhost:3000>. The admin dashboard is at <http://localhost:3000/admin.html>. The default database is created at `data/movemate.sqlite` automatically. Do not commit `.env` or the database file.

For local development with automatic restarts, run `npm run dev`.

## API

### Submit a quote

`POST /api/quotes` — JSON body:

```json
{
  "name": "Aarav Sharma",
  "phone": "+91 98765 43210",
  "from": "Ludhiana",
  "to": "Chandigarh",
  "date": "2026-12-10",
  "service": "Full move (pack, load & transport)",
  "message": "Two-bedroom apartment"
}
```

Returns `201` with the saved quote ID. Supported service values are the four choices shown in the website form.

### List quote requests (admin)

`GET /api/admin/quotes` or `GET /api/admin/quotes?status=new&limit=50`

Send `Authorization: Bearer YOUR_ADMIN_TOKEN`.

### Update a quote status (admin)

`PATCH /api/admin/quotes/:id` with `{"status":"contacted"}`. Supported statuses: `new`, `contacted`, `quoted`, `booked`, `closed`.

## Deploy on Render

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint** and select the repository. `render.yaml` configures a Docker web service, health check, generated admin token and a persistent disk for SQLite.
3. After deployment, open the service URL. Visit `/admin.html` for enquiries. Find the generated `ADMIN_TOKEN` in the Render service environment settings and use it to sign in.
4. Confirm the service health check at `/api/health` and submit a test quote before sharing the public URL.

The persistent disk is important: without persistent storage, SQLite data can be lost when a hosting instance is replaced.

## Before launch — important business setup

The source design contains example contact details (`(555) 010-2847`, `hello@movemate.example`), sample testimonials, and marketing figures such as `10,000+` moves and `4.9 / 5`. Replace these with your real business details and verified claims. The site currently stores enquiries; it does not send email/SMS notifications, calculate prices, take payments, or confirm bookings automatically. Add those integrations only after supplying the real business email, phone/WhatsApp number, pricing rules and payment provider details.

## Project structure

```text
public/
  index.html       Landing page and live quote form
  admin.html       Private-token quote dashboard
src/
  db.js            SQLite setup and schema
  server.js        Express API and static server
.github/workflows/
  ci.yml           GitHub Actions test workflow
Dockerfile
render.yaml
.env.example
```
