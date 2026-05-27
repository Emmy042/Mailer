import { Worker } from "bullmq";
import { emailQueueName, redisConnection } from "./queues.js";
import { getMailerSettings, sendQueuedEmail } from "./mailer.js";

const workerConcurrency = Number(process.env.WORKER_CONCURRENCY || 1);

const worker = new Worker(
  emailQueueName,
  async (job) => {
    console.log(`Sending job ${job.id} to ${job.data.recipient}`);
    const result = await sendQueuedEmail(job.data);
    console.log(`Sent job ${job.id}`, result);
    return result;
  },
  {
    connection: redisConnection,
    concurrency: workerConcurrency,
    limiter: {
      max: Number(process.env.EMAILS_PER_WINDOW || 1),
      duration: Number(process.env.EMAIL_WINDOW_MS || 15000)
    }
  }
);

worker.on("completed", (job) => {
  console.log(`Completed email job ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Failed email job ${job?.id || "unknown"}: ${error.message}`);
});

worker.on("error", (error) => {
  console.error(`Worker error: ${error.message}`);
});

console.log("Mailer worker started", {
  queue: emailQueueName,
  concurrency: workerConcurrency,
  mailer: getMailerSettings()
});

async function shutdown() {
  console.log("Shutting down mailer worker...");
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
