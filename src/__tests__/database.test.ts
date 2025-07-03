import { Database, pool } from '../database';

// Mock pg pool
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: jest.fn(),
    end: jest.fn(),
  })),
}));

const mockQuery = pool.query as jest.Mock;
const mockEnd = pool.end as jest.Mock;

describe('Database', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create a new job', async () => {
      const mockJob = {
        id: '123',
        event_id: 'test-event-id',
        status: 'pending',
        input_text: 'test text',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValue({
        rows: [mockJob],
      });

      const result = await Database.createJob('test-event-id', 'test text');

      expect(result).toEqual(mockJob);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO jobs'),
        ['test-event-id', 'test text']
      );
    });
  });

  describe('getJobByEventId', () => {
    it('should return job when found', async () => {
      const mockJob = {
        id: '123',
        event_id: 'test-event-id',
        status: 'pending',
        input_text: 'test text',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValue({
        rows: [mockJob],
      });

      const result = await Database.getJobByEventId('test-event-id');

      expect(result).toEqual(mockJob);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM jobs WHERE event_id = $1',
        ['test-event-id']
      );
    });

    it('should return null when job not found', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
      });

      const result = await Database.getJobByEventId('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status', async () => {
      mockQuery.mockResolvedValue({});

      await Database.updateJobStatus('test-event-id', 'processing');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE jobs'),
        ['processing', 'test-event-id']
      );
    });
  });

  describe('updateJobResult', () => {
    it('should update job with results', async () => {
      mockQuery.mockResolvedValue({});

      await Database.updateJobResult('test-event-id', 'summary', 'checklist');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE jobs'),
        ['summary', 'checklist', 'test-event-id']
      );
    });
  });

  describe('updateJobError', () => {
    it('should update job with error', async () => {
      mockQuery.mockResolvedValue({});

      await Database.updateJobError('test-event-id', 'error message');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE jobs'),
        ['error message', 'test-event-id']
      );
    });
  });

  describe('close', () => {
    it('should close the pool', async () => {
      await Database.close();

      expect(mockEnd).toHaveBeenCalled();
    });
  });
});