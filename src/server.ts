import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import { Database } from './database';
import { guidelineQueue } from './queue';
import { JobResponse } from './types';
import { swaggerSpec } from './swagger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * components:
 *   schemas:
 *     JobRequest:
 *       type: object
 *       required:
 *         - text
 *       properties:
 *         text:
 *           type: string
 *           description: The guideline text to process
 *     JobSubmissionResponse:
 *       type: object
 *       properties:
 *         event_id:
 *           type: string
 *           description: Unique identifier for the job
 *     JobStatusResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *         result:
 *           type: object
 *           properties:
 *             summary:
 *               type: string
 *             checklist:
 *               type: string
 *         error:
 *           type: string
 */

/**
 * @swagger
 * /jobs:
 *   post:
 *     summary: Submit a guideline ingestion job
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JobRequest'
 *     responses:
 *       200:
 *         description: Job submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSubmissionResponse'
 *       400:
 *         description: Invalid request
 */
app.post('/jobs', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text field is required and must be a string' });
    }

    const eventId = uuidv4();
    
    // Create job in database
    await Database.createJob(eventId, text);
    
    // Add job to queue
    await guidelineQueue.add('process-guideline', {
      eventId,
      text,
    });

    res.json({ event_id: eventId });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /jobs/{event_id}:
 *   get:
 *     summary: Get job status and result
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobStatusResponse'
 *       404:
 *         description: Job not found
 */
app.get('/jobs/:event_id', async (req, res) => {
  try {
    const { event_id } = req.params;
    
    const job = await Database.getJobByEventId(event_id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const response: JobResponse = {
      status: job.status,
    };

    if (job.status === 'completed' && job.summary && job.checklist) {
      response.result = {
        summary: job.summary,
        checklist: job.checklist,
      };
    }

    if (job.status === 'failed' && job.error_message) {
      response.error = job.error_message;
    }

    res.json(response);
  } catch (error) {
    console.error('Error retrieving job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     responses:
 *       200:
 *         description: Service is healthy
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await Database.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await Database.close();
  process.exit(0);
});

let server: any;

// Only start the server if not in test environment. had to do this to write test properly. 
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API docs available at http://localhost:${PORT}/api-docs`);
  });
}

export { app, server };