import { Queue } from "bullmq";
import net from "node:net";

const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = Number(process.env.REDIS_PORT || 6379);
const emailsPerWindow = Number(process.env.EMAILS_PER_WINDOW || 1);
const windowMs = Number(process.env.EMAIL_WINDOW_MS || 15000);

export const emailQueueName = "emailDelivery";

export const redisConnection = {
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null
};

let emailQueue;

export async function enqueueCampaign(campaign) {
  await assertRedisAvailable();
  const queue = getEmailQueue();

  const jobs = campaign.recipients.map((recipient, index) => ({
    name: "send-email",
    data: {
      campaignId: campaign.id,
      acceptedAt: campaign.acceptedAt,
      recipient,
      subject: campaign.subject,
      html: campaign.html
    },
    opts: {
      jobId: `${campaign.id}:${index}:${recipient.toLowerCase()}`
    }
  }));

  const queuedJobs = await queue.addBulk(jobs);

  return {
    queueName: emailQueueName,
    jobCount: queuedJobs.length,
    jobIds: queuedJobs.map((job) => job.id)
  };
}

export async function getQueueStatus() {
  await assertRedisAvailable();
  const queue = getEmailQueue();

  const counts = await queue.getJobCounts(
    "waiting",
    "delayed",
    "active",
    "completed",
    "failed",
    "paused"
  );

  return {
    queueName: emailQueueName,
    counts
  };
}

export function getEmailQueue() {
  if (!emailQueue) {
    emailQueue = new Queue(emailQueueName, {
      connection: redisConnection,
      limiter: {
        max: emailsPerWindow,
        duration: windowMs
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 30000
        },
        removeOnComplete: {
          age: 60 * 60 * 24,
          count: 1000
        },
        removeOnFail: {
          age: 60 * 60 * 24 * 7
        }
      }
    });
  }

  return emailQueue;
}

export function assertRedisAvailable(timeoutMs = 1000) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: redisHost,
      port: redisPort
    });

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      cleanup();
      resolve();
    });
    socket.once("timeout", () => {
      cleanup();
      reject(new Error(`Redis connection timed out at ${redisHost}:${redisPort}`));
    });
    socket.once("error", (error) => {
      cleanup();
      reject(new Error(`Redis is not reachable at ${redisHost}:${redisPort}: ${error.message}`));
    });
  });
}

export function getQueueSettings() {
  return {
    queueName: emailQueueName,
    redis: {
      host: redisHost,
      port: redisPort
    },
    limiter: {
      max: emailsPerWindow,
      duration: windowMs
    },
    redisAvailableCheckMs: 1000
  };
}
