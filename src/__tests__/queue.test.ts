// Mock dependencies
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
  })),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  }));
});

describe('Queue', () => {
  let mockQueue: any;
  let mockIORedis: any;
  let guidelineQueue: any;
  let redisConnection: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Import mocks after setup
    mockQueue = require('bullmq').Queue;
    mockIORedis = require('ioredis');
    
    // Set up mock queue instance
    const mockQueueInstance = {
      add: jest.fn(),
    };
    
    mockQueue.mockImplementation(() => mockQueueInstance);
    
    // Set up mock Redis connection
    const mockRedisInstance = {
      on: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
    mockIORedis.mockImplementation(() => mockRedisInstance);
    
    // Import the actual modules after mocks are set up
    const queueModule = require('../queue');
    guidelineQueue = queueModule.guidelineQueue;
    redisConnection = queueModule.redisConnection;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('guidelineQueue', () => {
    it('should have correct queue name', () => {
      expect(mockQueue).toHaveBeenCalledWith(
        'guideline-ingest',
        expect.objectContaining({
          connection: expect.any(Object),
          defaultJobOptions: {
            removeOnComplete: 10,
            removeOnFail: 5,
          },
        })
      );
    });
  });

  describe('Queue operations', () => {
    it('should add job to queue', async () => {
      const mockJobData = {
        eventId: 'test-event-id',
        text: 'Test guideline text',
      };

      const mockJob = { id: 'test-job-id' };
      guidelineQueue.add.mockResolvedValue(mockJob);

      const result = await guidelineQueue.add('process-guideline', mockJobData);

      expect(guidelineQueue.add).toHaveBeenCalledWith('process-guideline', mockJobData);
      expect(result).toEqual(mockJob);
    });
  });
}); 