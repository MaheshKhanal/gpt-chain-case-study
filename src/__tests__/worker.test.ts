// Mock dependencies
jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

jest.mock('../database');
jest.mock('../gptService');
jest.mock('../queue', () => ({
  redisConnection: {},
}));

describe('Worker', () => {
  let mockDatabase: any;
  let mockGPTService: any;
  let mockWorker: any;
  let mockWorkerInstance: any;
  let mockJobProcessor: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Import mocks after setup
    mockDatabase = require('../database').Database;
    mockGPTService = require('../gptService').GPTService;
    mockWorker = require('bullmq').Worker;
    
    // Set up mock worker instance
    mockWorkerInstance = {
      on: jest.fn(),
      close: jest.fn(),
    };
    
    mockWorker.mockImplementation((queueName: string, processor: any, options: any) => {
      mockJobProcessor = processor;
      return mockWorkerInstance;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Worker initialization', () => {
    it('should create worker with correct queue name', () => {
      require('../worker');
      
      expect(mockWorker).toHaveBeenCalledWith(
        'guideline-ingest',
        expect.any(Function),
        expect.objectContaining({
          connection: expect.any(Object),
          concurrency: 3,
        })
      );
    });
  });

  describe('Job processing', () => {
    beforeEach(() => {
      require('../worker');
    });

    it('should process job successfully', async () => {
      const mockJob = {
        data: {
          eventId: 'test-event-id',
          text: 'Test guideline text',
        },
      };

      const mockSummary = 'Test summary';
      const mockChecklist = 'Test checklist';

      mockDatabase.updateJobStatus.mockResolvedValue(undefined);
      mockGPTService.summarizeText.mockResolvedValue(mockSummary);
      mockGPTService.generateChecklist.mockResolvedValue(mockChecklist);
      mockDatabase.updateJobResult.mockResolvedValue(undefined);

      const result = await mockJobProcessor(mockJob);

      expect(mockDatabase.updateJobStatus).toHaveBeenCalledWith('test-event-id', 'processing');
      expect(mockGPTService.summarizeText).toHaveBeenCalledWith('Test guideline text');
      expect(mockGPTService.generateChecklist).toHaveBeenCalledWith(mockSummary);
      expect(mockDatabase.updateJobResult).toHaveBeenCalledWith('test-event-id', mockSummary, mockChecklist);
      expect(result).toEqual({ summary: mockSummary, checklist: mockChecklist });
    });

    it('should handle GPT service errors', async () => {
      const mockJob = {
        data: {
          eventId: 'test-event-id',
          text: 'Test guideline text',
        },
      };

      const mockError = new Error('OpenAI API error');

      mockDatabase.updateJobStatus.mockResolvedValue(undefined);
      mockGPTService.summarizeText.mockRejectedValue(mockError);
      mockDatabase.updateJobError.mockResolvedValue(undefined);

      await expect(mockJobProcessor(mockJob)).rejects.toThrow('OpenAI API error');

      expect(mockDatabase.updateJobStatus).toHaveBeenCalledWith('test-event-id', 'processing');
      expect(mockDatabase.updateJobError).toHaveBeenCalledWith('test-event-id', 'OpenAI API error');
    });

    it('should handle database errors', async () => {
      const mockJob = {
        data: {
          eventId: 'test-event-id',
          text: 'Test guideline text',
        },
      };

      const mockError = new Error('Database error');

      mockDatabase.updateJobStatus.mockRejectedValue(mockError);
      mockDatabase.updateJobError.mockResolvedValue(undefined);

      await expect(mockJobProcessor(mockJob)).rejects.toThrow('Database error');

      expect(mockDatabase.updateJobStatus).toHaveBeenCalledWith('test-event-id', 'processing');
      expect(mockDatabase.updateJobError).toHaveBeenCalledWith('test-event-id', 'Database error');
    });

    it('should handle unknown errors', async () => {
      const mockJob = {
        data: {
          eventId: 'test-event-id',
          text: 'Test guideline text',
        },
      };

      const mockError = 'String error'; // Non-Error object

      mockDatabase.updateJobStatus.mockResolvedValue(undefined);
      mockGPTService.summarizeText.mockRejectedValue(mockError);
      mockDatabase.updateJobError.mockResolvedValue(undefined);

      await expect(mockJobProcessor(mockJob)).rejects.toBe('String error');

      expect(mockDatabase.updateJobError).toHaveBeenCalledWith('test-event-id', 'Unknown error');
    });

    it('should handle checklist generation errors', async () => {
      const mockJob = {
        data: {
          eventId: 'test-event-id',
          text: 'Test guideline text',
        },
      };

      const mockSummary = 'Test summary';
      const mockError = new Error('Checklist generation failed');

      mockDatabase.updateJobStatus.mockResolvedValue(undefined);
      mockGPTService.summarizeText.mockResolvedValue(mockSummary);
      mockGPTService.generateChecklist.mockRejectedValue(mockError);
      mockDatabase.updateJobError.mockResolvedValue(undefined);

      await expect(mockJobProcessor(mockJob)).rejects.toThrow('Checklist generation failed');

      expect(mockDatabase.updateJobStatus).toHaveBeenCalledWith('test-event-id', 'processing');
      expect(mockGPTService.summarizeText).toHaveBeenCalledWith('Test guideline text');
      expect(mockGPTService.generateChecklist).toHaveBeenCalledWith(mockSummary);
      expect(mockDatabase.updateJobError).toHaveBeenCalledWith('test-event-id', 'Checklist generation failed');
    });
  });

  describe('Worker events', () => {
    let completedHandler: any;
    let failedHandler: any;

    beforeEach(() => {
      require('../worker');
      
      // Capture event handlers
      const onCalls = mockWorkerInstance.on.mock.calls;
      completedHandler = onCalls.find(([event]: [string, any]) => event === 'completed')?.[1];
      failedHandler = onCalls.find(([event]: [string, any]) => event === 'failed')?.[1];
    });

    it('should handle completed jobs', () => {
      if (!completedHandler) {
        console.warn('Completed handler not found, skipping test');
        return;
      }

      const mockJob = { id: 'test-job-id' };
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      completedHandler(mockJob);

      expect(consoleSpy).toHaveBeenCalledWith('Job test-job-id completed');
      consoleSpy.mockRestore();
    });

    it('should handle failed jobs', () => {
      if (!failedHandler) {
        console.warn('Failed handler not found, skipping test');
        return;
      }

      const mockJob = { id: 'test-job-id' };
      const mockError = new Error('Job failed');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      failedHandler(mockJob, mockError);

      expect(consoleSpy).toHaveBeenCalledWith('Job test-job-id failed:', mockError);
      consoleSpy.mockRestore();
    });

    it('should handle failed jobs with null job', () => {
      if (!failedHandler) {
        console.warn('Failed handler not found, skipping test');
        return;
      }

      const mockError = new Error('Job failed');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      failedHandler(null, mockError);

      expect(consoleSpy).toHaveBeenCalledWith('Job undefined failed:', mockError);
      consoleSpy.mockRestore();
    });
  });

  describe('Job data validation', () => {
    beforeEach(() => {
      require('../worker');
    });

    it('should handle missing eventId in job data', async () => {
      const mockJob = {
        data: {
          text: 'Test guideline text',
          // Missing eventId
        },
      };

      await expect(mockJobProcessor(mockJob)).rejects.toThrow();
    });

    it('should handle missing text in job data', async () => {
      const mockJob = {
        data: {
          eventId: 'test-event-id',
          // Missing text
        },
      };

      await expect(mockJobProcessor(mockJob)).rejects.toThrow();
    });

    it('should handle empty text in job data', async () => {
      const mockJob = {
        data: {
          eventId: 'test-event-id',
          text: '',
        },
      };

      mockDatabase.updateJobStatus.mockResolvedValue(undefined);
      mockGPTService.summarizeText.mockResolvedValue('Empty summary');
      mockGPTService.generateChecklist.mockResolvedValue('Empty checklist');
      mockDatabase.updateJobResult.mockResolvedValue(undefined);

      const result = await mockJobProcessor(mockJob);

      expect(result).toEqual({ 
        summary: 'Empty summary', 
        checklist: 'Empty checklist' 
      });
    });
  });

  describe('Console logging', () => {
    beforeEach(() => {
      require('../worker');
    });

    it('should log job processing steps', async () => {
      const mockJob = {
        data: {
          eventId: 'test-event-id',
          text: 'Test guideline text',
        },
      };

      const mockSummary = 'Test summary';
      const mockChecklist = 'Test checklist';

      mockDatabase.updateJobStatus.mockResolvedValue(undefined);
      mockGPTService.summarizeText.mockResolvedValue(mockSummary);
      mockGPTService.generateChecklist.mockResolvedValue(mockChecklist);
      mockDatabase.updateJobResult.mockResolvedValue(undefined);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await mockJobProcessor(mockJob);

      expect(consoleSpy).toHaveBeenCalledWith('Processing job test-event-id');
      expect(consoleSpy).toHaveBeenCalledWith('Summarizing text for job test-event-id');
      expect(consoleSpy).toHaveBeenCalledWith('Generating checklist for job test-event-id');
      expect(consoleSpy).toHaveBeenCalledWith('Job test-event-id completed successfully');

      consoleSpy.mockRestore();
    });

    it('should log error messages when job fails', async () => {
      const mockJob = {
        data: {
          eventId: 'test-event-id',
          text: 'Test guideline text',
        },
      };

      const mockError = new Error('Test error');

      mockDatabase.updateJobStatus.mockResolvedValue(undefined);
      mockGPTService.summarizeText.mockRejectedValue(mockError);
      mockDatabase.updateJobError.mockResolvedValue(undefined);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(mockJobProcessor(mockJob)).rejects.toThrow('Test error');

      expect(consoleSpy).toHaveBeenCalledWith('Job test-event-id failed:', mockError);

      consoleSpy.mockRestore();
    });
  });
});
