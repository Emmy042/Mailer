# Progress Tracker

## Phase 3: Delay Engine / Message Queue

### 2026-05-26

- Started Phase 3 implementation.
- Goal: add Redis + BullMQ queue support so accepted campaign payloads create one queued job per recipient instead of stopping at API validation.
- Current state before edits: Phase 2 Express API accepts and validates campaign payloads, returns a campaign acceptance response, but does not queue or send messages.
- Reviewed current `package.json` and `server.js`.
- Decision: add BullMQ with Redis connection settings controlled by environment variables, then enqueue one job per recipient from `POST /api/campaigns`.
- Constraint: actual mail delivery remains out of scope for Phase 3; queued jobs will wait for the Phase 4 worker/delivery implementation.
- Installed `bullmq`.
- Added `queues.js` with the `emailDelivery` queue, Redis connection settings, queue limiter, retry/backoff settings, and `enqueueCampaign()`.
- Updated `server.js` so `POST /api/campaigns` creates one BullMQ job per recipient and returns queue details.
- Updated `GET /api/health` to expose queue configuration.
- Updated `README.md` with Redis and Phase 3 queue settings.
- Added a fast Redis reachability check before queueing so the API returns a clear `503` if Redis is not running.
- Added JSON error handling so malformed JSON requests return a structured API error instead of Express's default HTML error page.
- Confirmed Redis is not installed/listening locally, and Docker is not available.
- Added `GET /api/queue` for queue inspection once Redis is running.
- Changed frontend API submission to `http://127.0.0.1:3000/api/campaigns` so direct `file:///.../index.html` usage can still call the Phase 2/3 API.
- Restarted the API server with Phase 3 changes.
- Verified syntax for `server.js`, `queues.js`, and `app.js`.
- Verified `GET /api/health` returns queue settings.
- Verified `GET /api/queue` returns a structured `503` while Redis is unavailable.
- Verified `POST /api/campaigns` validates the campaign and returns a structured `503` while Redis is unavailable.
- Work remaining before Phase 3 can enqueue real jobs: install/start Redis on `127.0.0.1:6379`, then retry `POST /api/campaigns`.

## Redis Setup Attempt

### 2026-05-26

- Checked for `redis-server`: not installed.
- Checked for Docker: not installed/available.
- Checked for `winget`: not installed/available.
- Checked WSL: WSL exists, but no Linux distributions are installed.
- Current Redis status: blocked until Redis is installed through WSL, Docker, Windows package, or a hosted Redis endpoint.

## Phase 4: Delivery Worker

### 2026-05-26

- Started Phase 4 implementation.
- Goal: add a BullMQ worker that consumes `emailDelivery` jobs and sends each email through Nodemailer.
- Constraint: this machine does not currently have Redis or Postfix available, so Phase 4 can be implemented and syntax-tested, but cannot send real mail locally yet.
- Installed `nodemailer`.
- Added `mailer.js` with environment-based SMTP settings and `sendQueuedEmail()`.
- Added `worker.js` with a BullMQ `Worker` consuming the `emailDelivery` queue at one job per 15 seconds by default.
- Updated `GET /api/health` to show mailer settings without exposing credentials.
- Added `npm run worker`.
- Updated `README.md` with Phase 4 worker and SMTP environment settings.
- Refactored `queues.js` so the API creates the BullMQ queue lazily only after Redis reachability passes, preventing noisy Redis connection errors while Redis is absent.

## Remaining Work / Resume Point

### Infrastructure Required Before Real Sending

- Install and start Redis on `127.0.0.1:6379`.
- Recommended available path on this machine: install Ubuntu 24.04 through WSL, then install Redis inside Ubuntu.
- Redis install was started as an option, but the WSL install command was interrupted by the user before completion.
- Alternative Redis paths: install Docker Desktop and run Redis container, install a native Windows Redis-compatible server, or use a hosted Redis endpoint and set `REDIS_HOST` / `REDIS_PORT`.

### Phase 3 Completion Checks

- Start Redis.
- Restart the Mailer API.
- Submit a test campaign from the UI.
- Confirm `POST /api/campaigns` returns `202` with queue details.
- Confirm `GET /api/queue` shows waiting/delayed jobs.

### Phase 4 Completion Checks

- Configure a real SMTP server.
- Options:
  - Local Postfix inside WSL/Linux.
  - A reachable SMTP provider such as Mailgun, SendGrid, Amazon SES, Gmail SMTP, or another authenticated SMTP relay.
- Set mailer environment variables:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_SECURE`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `MAIL_FROM_NAME`
  - `MAIL_FROM_ADDRESS`
  - `MAIL_REPLY_TO`
- Start the worker with `npm run worker`.
- Submit a test campaign and confirm the worker consumes the queued job.
- Confirm Nodemailer reports accepted/rejected recipients.

### Phase 5: Logging & Database

- Install and configure PostgreSQL.
- Add database schema for:
  - campaigns
  - recipients/jobs
  - delivery attempts
  - failures/status messages
- Record campaign acceptance in the API.
- Record queued job creation.
- Record worker success/failure results from Nodemailer.
- Add API endpoints for delivery history and campaign status.
- Add UI panel for recent campaigns and delivery results.

### Deliverability / Production Hardening

- Configure a real sending domain.
- Add SPF, DKIM, and DMARC DNS records.
- Configure reverse DNS if using a self-hosted mail server.
- Add sender settings to the UI:
  - From name
  - From email
  - Reply-to email
- Add unsubscribe/footer support before any bulk or recurring use.
- Add bounce handling when using an SMTP provider or configured MTA.
- Add rate-limit controls in the UI/API.
- Add authentication before exposing the app beyond localhost.

### Current Status Summary

- Phase 1: implemented.
- Phase 2: implemented.
- Phase 3: code implemented, blocked on Redis runtime.
- Phase 4: code implemented, blocked on Redis plus SMTP/Postfix runtime.
- Phase 5: not started.

## Continuation

### 2026-05-27

- Resumed from `progress-tracker.md`.
- Confirmed Mailer API is currently listening on port `3000`.
- Confirmed Redis is still not listening on port `6379`.
- Next action: install/start Redis so Phase 3 can enqueue real BullMQ jobs.
