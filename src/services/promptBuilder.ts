import type { GeminiContent } from "./aiContextService.js";
import type { TavilySearchResult } from "./tavilyService.js";

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

  build(
    messages: GeminiContent[],
    searchResults: TavilySearchResult[] = [],
  ): AIRequestPayload {
    let systemInstruction = this.SYSTEM_PROMPT.trim();

    if (searchResults.length > 0) {
      const formatted = searchResults
        .map(
          (result, index) =>
            `[${index + 1}] ${result.title} (${result.url})\n${result.content}`,
        )
        .join("\n\n");

      systemInstruction += `

You were given the following live web search results for the user's message. Use them if relevant, and prefer them over your own knowledge for anything time-sensitive or current. Do not mention "search results" explicitly unless asked — just answer naturally. If they aren't relevant, ignore them.

${formatted}`;
    }

    return {
      systemInstruction,
      contents: messages,
    };
  }
}

export default new PromptBuilder();