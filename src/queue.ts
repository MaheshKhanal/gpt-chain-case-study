import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Create ioredis connection for BullMQ
const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const guidelineQueue = new Queue('guideline-ingest', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
  },
});

export { redisConnection };