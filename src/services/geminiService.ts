import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import config from "../config/index.js";
import logger from "./logger.js";
import { AIRequestPayload } from "./promptBuilder.js";

// Initialize with the API Key object as required by your compiler
const genAI = new GoogleGenAI({ apiKey: config.gemini.apiKey });

class GeminiService {
  readonly modelName = "gemini-1.5-flash";

  async generate(payload: AIRequestPayload): Promise<string> {
    try {
      /** 
       * We use a type-cast to 'any' here because the TypeScript compiler 
       * in some environments fails to see this method on the V1 SDK types, 
       * even though it exists at runtime.
       */
      const model = (genAI as any).getGenerativeModel({
        model: this.modelName,
        systemInstruction: payload.systemInstruction,
      });

      const result = await model.generateContent({
        contents: payload.contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });

      const response = await result.response;
      const text = response.text();

      if (!text) throw new Error("Empty response from Gemini API");
      return text;
    } catch (error: any) {
      logger.error("[Gemini Service] API Error:", error);
      if (error.message?.includes("429")) {
        return "⚠️ The AI is currently overloaded. Please try again in a minute.";
      }
      throw error;
    }
  }
}

export default new GeminiService();