import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import config from "../config/index.js";
import logger from "./logger.js";
import { AIRequestPayload } from "./promptBuilder.js";

const ai = new GoogleGenAI(config.gemini.apiKey);

class GeminiService {
  readonly modelName = "gemini-1.5-flash";

  async generate(payload: AIRequestPayload): Promise<string> {
    try {
      const model = ai.getGenerativeModel({
        model: this.modelName,
        // Use native systemInstruction field to prevent prompt injection
        systemInstruction: payload.systemInstruction,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });

      const result = await model.generateContent({
        contents: payload.contents,
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