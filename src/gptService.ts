import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
// I am little unsure about the exact prompt here as I dont know the exact input structure that I will be getting from the post request. But, This should serve as an example. 
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
// same with this one. We can modify the prompt so LLM can better understand the context of the input. 
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