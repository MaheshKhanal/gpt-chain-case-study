import request from 'supertest';
import { app, server } from '../server';
import { Database } from '../database';

// Mock dependencies
jest.mock('../database');
jest.mock('../queue', () => ({
  guidelineQueue: {
    add: jest.fn(),
  },
}));
jest.mock('../gptService');

const mockDatabase = Database as jest.Mocked<typeof Database>;
const mockQueue = require('../queue').guidelineQueue;

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  describe('POST /jobs', () => {
    it('should create a job and return event_id', async () => {
      const mockJob = {
        id: '123',
        event_id: 'test-event-id',
        status: 'pending' as const,
        input_text: 'test text',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDatabase.createJob.mockResolvedValue(mockJob);
      mockQueue.add.mockResolvedValue({} as any);

      const response = await request(app)
        .post('/jobs')
        .send({ text: 'test guideline text' })
        .expect(200);

      expect(response.body).toHaveProperty('event_id');
      expect(typeof response.body.event_id).toBe('string');
      expect(mockDatabase.createJob).toHaveBeenCalledWith(
        expect.any(String),
        'test guideline text'
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-guideline',
        expect.objectContaining({
          eventId: expect.any(String),
          text: 'test guideline text',
        })
      );
    });

    it('should return 400 for missing text', async () => {
      const response = await request(app)
        .post('/jobs')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid text type', async () => {
      const response = await request(app)
        .post('/jobs')
        .send({ text: 123 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /jobs/:event_id', () => {
    it('should return job status for pending job', async () => {
      const mockJob = {
        id: '123',
        event_id: 'test-event-id',
        status: 'pending' as const,
        input_text: 'test text',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDatabase.getJobByEventId.mockResolvedValue(mockJob);

      const response = await request(app)
        .get('/jobs/test-event-id')
        .expect(200);

      expect(response.body).toEqual({
        status: 'pending',
      });
    });

    it('should return job status and result for completed job', async () => {
      const mockJob = {
        id: '123',
        event_id: 'test-event-id',
        status: 'completed' as const,
        input_text: 'test text',
        summary: 'Test summary',
        checklist: 'Test checklist',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDatabase.getJobByEventId.mockResolvedValue(mockJob);

      const response = await request(app)
        .get('/jobs/test-event-id')
        .expect(200);

      expect(response.body).toEqual({
        status: 'completed',
        result: {
          summary: 'Test summary',
          checklist: 'Test checklist',
        },
      });
    });

    it('should return job status and error for failed job', async () => {
      const mockJob = {
        id: '123',
        event_id: 'test-event-id',
        status: 'failed' as const,
        input_text: 'test text',
        error_message: 'Test error',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDatabase.getJobByEventId.mockResolvedValue(mockJob);

      const response = await request(app)
        .get('/jobs/test-event-id')
        .expect(200);

      expect(response.body).toEqual({
        status: 'failed',
        error: 'Test error',
      });
    });

    it('should return 404 for non-existent job', async () => {
      mockDatabase.getJobByEventId.mockResolvedValue(null);

      const response = await request(app)
        .get('/jobs/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});