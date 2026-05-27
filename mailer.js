import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "127.0.0.1";
const smtpPort = Number(process.env.SMTP_PORT || 25);
const smtpSecure = parseBoolean(process.env.SMTP_SECURE, false);
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const senderName = process.env.MAIL_FROM_NAME || "Mailer";
const senderAddress = process.env.MAIL_FROM_ADDRESS || "mailer@localhost";
const replyTo = process.env.MAIL_REPLY_TO || senderAddress;

export function createTransport() {
  const auth = smtpUser && smtpPass
    ? {
        user: smtpUser,
        pass: smtpPass
      }
    : undefined;

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth
  });
}

export async function sendQueuedEmail(jobData) {
  const transporter = createTransport();
  const result = await transporter.sendMail({
    from: formatAddress(senderName, senderAddress),
    to: jobData.recipient,
    replyTo,
    subject: jobData.subject,
    html: jobData.html,
    headers: {
      "X-Mailer-Campaign": jobData.campaignId
    }
  });

  return {
    messageId: result.messageId,
    accepted: result.accepted,
    rejected: result.rejected,
    response: result.response
  };
}

export function getMailerSettings() {
  return {
    smtp: {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      authConfigured: Boolean(smtpUser && smtpPass)
    },
    from: formatAddress(senderName, senderAddress),
    replyTo
  };
}

function formatAddress(name, address) {
  const cleanName = String(name).replace(/"/g, "");
  return `"${cleanName}" <${address}>`;
}

function parseBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}
