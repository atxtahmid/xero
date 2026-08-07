import { GoogleGenAI } from "@google/genai";
import config from "../../config/index.js";
import logger from "../../logger/logger.js";
import type { AIRequestPayload } from "./promptBuilder.js";

if (!config.gemini.apiKey) {
  throw new Error("Gemini API key is missing.");
}

const ai = new GoogleGenAI({
  apiKey: config.gemini.apiKey,
});

class GeminiService {
  // gemini-2.0-flash: faster, lower cost, supports long context.
  // gemini-1.5-flash was deprecated mid-2026.
  private readonly modelName = "gemini-2.0-flash";

  private readonly generationConfig = {
    temperature: 0.7,
    maxOutputTokens: 2048,
  };

  async generate(payload: AIRequestPayload): Promise<string> {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await ai.models.generateContent({
          model: this.modelName,
          contents: payload.contents,
          config: {
            ...this.generationConfig,
            systemInstruction: payload.systemInstruction,
          },
        });

        // result.text is a convenience getter in @google/genai SDK but can
        // throw or return undefined if the response was blocked or had no
        // parts. Extracting manually is safer.
        const text =
          result.candidates?.[0]?.content?.parts
            ?.map((p) => p.text ?? "")
            .join("")
            .trim() ?? "";

        if (!text) {
          // Could be a safety block with no candidates — surface it properly.
          const blockReason =
            result.candidates?.[0]?.finishReason ??
            result.promptFeedback?.blockReason ??
            "unknown";

          logger.warn(`[Gemini Service] Empty response. Reason: ${blockReason}`);

          if (
            String(blockReason).toLowerCase().includes("safety") ||
            String(blockReason).toLowerCase().includes("block")
          ) {
            return "⚠️ I couldn't generate a response because the request was blocked by AI safety filters.";
          }

          throw new Error(`Empty response from Gemini API. Reason: ${blockReason}`);
        }

        return text.length > 2000 ? `${text.slice(0, 1997)}...` : text;
      } catch (error: unknown) {
        if (error instanceof Error) {
          logger.error("[Gemini Service] API Error", {
            message: error.message,
            stack: error.stack,
          });

          const message = error.message.toLowerCase();

          if (message.includes("429") || message.includes("quota")) {
            return "⚠️ The AI is currently overloaded. Please try again in a minute.";
          }

          if (message.includes("safety") || message.includes("block")) {
            return "⚠️ I couldn't generate a response because the request was blocked by AI safety filters.";
          }

          if (
            attempt < 2 &&
            (message.includes("500") ||
              message.includes("503") ||
              message.includes("internal"))
          ) {
            continue;
          }
        } else {
          logger.error("[Gemini Service] Unknown API Error", error);
        }

        throw error;
      }
    }

    throw new Error("Gemini request failed after retries.");
  }
}

export default new GeminiService();
