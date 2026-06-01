# SMTP Mailer

SMTP Mailer is a local campaign composer and delivery pipeline for sending HTML email through a queued Node.js backend.

## Open the frontend

Open `index.html` directly in a browser.

For API submission, run the backend and open `http://127.0.0.1:3000/`.

## Current scope

- Subject input with character count.
- Comma, semicolon, or newline separated recipient entry.
- Recipient validation, duplicate filtering, and count summary.
- Quill rich text editor for HTML email composition.
- Plain textarea fallback if the editor CDN is unavailable.
- HTML template mode for pasting email HTML copied from another email or tool.
- Browser-local template saving, loading, and deleting with `localStorage`.
- Rendered email preview.
- Developer payload preview hidden behind a `Developer payload` toggle.
- Express API endpoint for accepting validated campaign payloads.
- BullMQ queue creation backed by Redis.
- Nodemailer delivery worker for queued email jobs.

The prepared API payload shape is:

```json
{
  "recipients": ["alex@example.com"],
  "subject": "Quarterly update",
  "html": "<p>Hello from the campaign composer.</p>"
}
```

## HTML templates

Use `HTML Template` mode when you already have an email template from another source.

- Paste a full HTML document or an HTML body fragment into the template editor.
- The email preview renders the pasted HTML before sending.
- Save named templates in the browser for reuse.
- Load or delete saved templates from the saved-template selector.

Saved templates are currently stored only in the current browser through `localStorage`. They are not shared across browsers, devices, or users.

## Run the API

Install dependencies:

```powershell
npm install
```

Start Redis on `127.0.0.1:6379`, then start the API:

```powershell
npm start
```

The API will serve the frontend and listen for submissions at:

```text
POST http://127.0.0.1:3000/api/campaigns
GET  http://127.0.0.1:3000/api/queue
```

If Redis is not running, the app can still load and preview campaigns, but campaign submission will return a structured `503` response because jobs cannot be queued.

## Queue settings

By default, campaigns are queued to BullMQ with Redis at:

```text
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
EMAILS_PER_WINDOW=1
EMAIL_WINDOW_MS=15000
```

That queues one job per recipient and lets the delivery worker process one email every 15 seconds by default.

## Run the delivery worker

The delivery worker uses Nodemailer to send queued jobs through SMTP.

Default local SMTP/Postfix settings:

```text
SMTP_HOST=127.0.0.1
SMTP_PORT=25
SMTP_SECURE=false
MAIL_FROM_NAME=Mailer
MAIL_FROM_ADDRESS=mailer@localhost
MAIL_REPLY_TO=mailer@localhost
WORKER_CONCURRENCY=1
```

Start the worker after Redis and your SMTP server are running:

```powershell
npm run worker
```

On this Windows machine, Redis and Postfix are not currently installed. The worker is ready, but real sending requires Redis plus a reachable SMTP server.

## Before production use

- Configure Redis and confirm `GET /api/queue` shows queued jobs.
- Configure a real SMTP server or provider and confirm accepted/rejected recipients from Nodemailer.
- Configure a real sending domain with SPF, DKIM, and DMARC.
- Add unsubscribe/footer support before bulk or recurring sends.
- Add authentication before exposing the app beyond localhost.
- Add persistent storage if templates, campaign history, or delivery results must survive browser/device changes.
