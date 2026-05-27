# SMTP Mailer

Phase 1 implements a static campaign composer for the custom SMTP mailer roadmap.

## Open the frontend

Open `index.html` directly in a browser.

For Phase 2 API submission, run the backend and open `http://127.0.0.1:3000/`.

## Current scope

- Subject input with character count.
- Comma, semicolon, or newline separated recipient entry.
- Recipient validation, duplicate filtering, and count summary.
- Quill rich text editor for HTML email composition.
- Plain textarea fallback if the editor CDN is unavailable.
- Rendered email preview.
- Backend-ready JSON payload preview.
- Express API endpoint for accepting validated campaign payloads.
- BullMQ queue creation backed by Redis.

The prepared payload shape for Phase 2 is:

```json
{
  "recipients": ["alex@example.com"],
  "subject": "Quarterly update",
  "html": "<p>Hello from the campaign composer.</p>"
}
```

## Run the API

Install dependencies:

```powershell
npm install
```

Start Redis on `127.0.0.1:6379`, then start the server:

```powershell
npm start
```

The API will serve the frontend and listen for submissions at:

```text
POST http://127.0.0.1:3000/api/campaigns
GET  http://127.0.0.1:3000/api/queue
```

## Phase 3 queue settings

By default, campaigns are queued to BullMQ with Redis at:

```text
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
EMAILS_PER_WINDOW=1
EMAIL_WINDOW_MS=15000
```

That queues one job per recipient and lets the delivery worker process one email every 15 seconds in Phase 4.

## Run the delivery worker

Phase 4 uses Nodemailer to send queued jobs through SMTP.

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
