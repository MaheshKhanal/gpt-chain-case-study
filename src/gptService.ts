import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class GPTService {
  static async summarizeText(text: string): Promise<string> {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise summaries of guidelines and documents.'
        },
        {
          role: 'user',
          content: `Please provide a concise summary of the following text:\n\n${text}`
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content || 'No summary generated';
  }

  static async generateChecklist(summary: string): Promise<string> {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates actionable checklists based on summaries.'
        },
        {
          role: 'user',
          content: `Based on this summary, create a practical checklist of action items:\n\n${summary}`
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content || 'No checklist generated';
  }
}