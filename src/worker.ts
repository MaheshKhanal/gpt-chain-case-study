import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import { Database } from './database';
import { GPTService } from './gptService';
import { redisConnection } from './queue';

dotenv.config();

const worker = new Worker(
  'guideline-ingest',
  async (job) => {
    const { eventId, text } = job.data;
    
    try {
      console.log(`Processing job ${eventId}`);
      
      // Update status to processing
      await Database.updateJobStatus(eventId, 'processing');
      
      // Step 1: Summarize the text
      console.log(`Summarizing text for job ${eventId}`);
      const summary = await GPTService.summarizeText(text);
      
      // Step 2: Generate checklist from summary
      console.log(`Generating checklist for job ${eventId}`);
      const checklist = await GPTService.generateChecklist(summary);
      
      // Update job with results
      await Database.updateJobResult(eventId, summary, checklist);
      
      console.log(`Job ${eventId} completed successfully`);
      
      return { summary, checklist };
    } catch (error) {
      console.error(`Job ${eventId} failed:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await Database.updateJobError(eventId, errorMessage);
      
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 3, // Process up to 3 jobs concurrently
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

console.log('Worker started and waiting for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down worker gracefully');
  await worker.close();
  await Database.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down worker gracefully');
  await worker.close();
  await Database.close();
  process.exit(0);
});

export { worker };