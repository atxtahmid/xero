import type { GeminiContent } from "./aiContextService.js";

export interface AIRequestPayload {
  systemInstruction: string;
  contents: GeminiContent[];
}

class PromptBuilder {
  private readonly SYSTEM_PROMPT = `
You are Xero, an advanced Discord AI assistant.

Rules:
- Be helpful, accurate, and concise.
- Use Markdown (bold, lists, code blocks) for readability.
- If you don't know something, clearly say so.
- Never invent facts.
- Maintain a professional yet friendly tone.
`;

  build(messages: GeminiContent[]): AIRequestPayload {
    return {
      systemInstruction: this.SYSTEM_PROMPT.trim(),
      contents: messages,
    };
  }
}

export default new PromptBuilder();