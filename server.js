import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { enqueueCampaign, getQueueSettings, getQueueStatus } from "./queues.js";
import { getMailerSettings } from "./mailer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "smtp-mailer-api",
    queue: getQueueSettings(),
    mailer: getMailerSettings()
  });
});

app.get("/api/queue", async (_req, res) => {
  try {
    const queue = await getQueueStatus();
    return res.json({
      ok: true,
      queue
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      errors: [
        "Redis/BullMQ is not available. Start Redis to inspect the queue.",
        error.message
      ]
    });
  }
});

app.post("/api/campaigns", async (req, res) => {
  const validation = validateCampaign(req.body);

  if (!validation.ok) {
    return res.status(400).json({
      ok: false,
      errors: validation.errors
    });
  }

  const acceptedAt = new Date().toISOString();
  const campaign = {
    id: createCampaignId(),
    acceptedAt,
    recipientCount: validation.payload.recipients.length,
    subject: validation.payload.subject,
    html: validation.payload.html,
    recipients: validation.payload.recipients
  };
  let queueResult;

  try {
    queueResult = await enqueueCampaign(campaign);
  } catch (error) {
    return res.status(503).json({
      ok: false,
      errors: [
        "Campaign is valid, but Redis/BullMQ is not available. Start Redis and try again.",
        error.message
      ]
    });
  }

  return res.status(202).json({
    ok: true,
    message: "Campaign accepted and queued.",
    campaign: {
      id: campaign.id,
      acceptedAt: campaign.acceptedAt,
      recipientCount: campaign.recipientCount,
      subject: campaign.subject
    },
    queue: queueResult
  });
});

app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({
      ok: false,
      errors: ["Request body must be valid JSON."]
    });
  }

  return next(error);
});

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    errors: [`Route not found: ${req.method} ${req.path}`]
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    ok: false,
    errors: ["Unexpected server error."]
  });
});

app.listen(port, () => {
  console.log(`Mailer API running at http://127.0.0.1:${port}`);
});

function validateCampaign(body) {
  const errors = [];

  if (!body || typeof body !== "object") {
    return {
      ok: false,
      errors: ["Request body must be a JSON object."]
    };
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const html = typeof body.html === "string" ? body.html.trim() : "";
  const recipients = Array.isArray(body.recipients) ? body.recipients : [];
  const normalizedRecipients = [];
  const seen = new Set();

  if (!subject) {
    errors.push("Subject is required.");
  }

  if (subject.length > 160) {
    errors.push("Subject must be 160 characters or fewer.");
  }

  if (!html) {
    errors.push("HTML body is required.");
  }

  if (!recipients.length) {
    errors.push("At least one recipient is required.");
  }

  for (const recipient of recipients) {
    if (typeof recipient !== "string") {
      errors.push("Every recipient must be an email string.");
      continue;
    }

    const trimmed = recipient.trim();
    const normalized = trimmed.toLowerCase();

    if (!emailPattern.test(trimmed)) {
      errors.push(`Invalid recipient: ${trimmed || "(blank)"}`);
      continue;
    }

    if (!seen.has(normalized)) {
      seen.add(normalized);
      normalizedRecipients.push(trimmed);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    payload: {
      subject,
      html,
      recipients: normalizedRecipients
    }
  };
}

function createCampaignId() {
  const datePart = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `camp_${datePart}_${randomPart}`;
}
