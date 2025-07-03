// Set up the mock before importing
jest.mock('openai');

import { GPTService } from '../gptService';
import { mockCreate } from '../__tests__/__mocks__/openai';

describe('GPTService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('summarizeText', () => {
    it('should return a summary from OpenAI', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'This is a test summary',
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await GPTService.summarizeText('Test input text');

      expect(result).toBe('This is a test summary');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates concise summaries of guidelines and documents.'
          },
          {
            role: 'user',
            content: 'Please provide a concise summary of the following text:\n\nTest input text'
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      });
    });

    it('should return default message when no content is returned', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await GPTService.summarizeText('Test input text');

      expect(result).toBe('No summary generated');
    });
  });

  describe('generateChecklist', () => {
    it('should return a checklist from OpenAI', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '1. First item\n2. Second item',
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await GPTService.generateChecklist('Test summary');

      expect(result).toBe('1. First item\n2. Second item');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates actionable checklists based on summaries.'
          },
          {
            role: 'user',
            content: 'Based on this summary, create a practical checklist of action items:\n\nTest summary'
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      });
    });

    it('should return default message when no content is returned', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await GPTService.generateChecklist('Test summary');

      expect(result).toBe('No checklist generated');
    });
  });
});