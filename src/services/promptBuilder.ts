import { GeminiContent } from "./aiContextService.js";

export type AIRequestPayload = {
  systemInstruction: string;
  contents: GeminiContent[];
};

class PromptBuilder {
  build(messages: GeminiContent[]): AIRequestPayload {
    const systemPrompt = `
You are Xero, an advanced Discord AI assistant.
Rules:
- Be helpful, accurate, and concise.
- Use Markdown (bold, lists, code blocks) for readability.
- If you don't know a fact, say so. Do not invent information.
- Maintain a professional yet friendly tone.
`;

    return {
      systemInstruction: systemPrompt.trim(),
      contents: messages,
    };
  }
}

export default new PromptBuilder();