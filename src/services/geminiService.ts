import { GoogleGenAI } from "@google/genai";
import config from "../config/index.js";
import logger from "./logger.js";
import type { AIRequestPayload } from "./promptBuilder.js";

if (!config.gemini.apiKey) {
  throw new Error("Gemini API key is missing.");
}

const ai = new GoogleGenAI({
  apiKey: config.gemini.apiKey,
});

class GeminiService {
  private readonly modelName = "gemini-1.5-flash";

  private readonly generationConfig = {
    systemInstruction: "",
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

        const text = result.text?.trim() ?? "";

        if (!text) {
          throw new Error("Empty response from Gemini API.");
        }

        return text.length > 2000
          ? `${text.slice(0, 1997)}...`
          : text;
      } catch (error: unknown) {
        if (error instanceof Error) {
          logger.error("[Gemini Service] API Error", {
            message: error.message,
            stack: error.stack,
          });

          const message = error.message.toLowerCase();

          if (
            message.includes("429") ||
            message.includes("quota")
          ) {
            return "⚠️ The AI is currently overloaded. Please try again in a minute.";
          }

          if (
            attempt < 2 &&
            (message.includes("500") ||
              message.includes("503") ||
              message.includes("internal"))
          ) {
            continue;
          }

          if (message.includes("safety")) {
            return "⚠️ I couldn't generate a response because the request was blocked by AI safety filters.";
          }
        } else {
          logger.error("[Gemini Service] Unknown API Error", error);
        }

        throw error;
      }
    }

    throw new Error("Gemini request failed.");
  }
}

export default new GeminiService();