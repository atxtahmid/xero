import { GoogleGenAI } from "@google/genai";

import config from "../config/index.js";

const ai = new GoogleGenAI({
  apiKey: config.gemini.apiKey,
});

class GeminiService {
  // Current supported Gemini model
  readonly model = "gemini-2.5-flash-lite";

  async generate(prompt: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: this.model,
      contents: prompt,
    });

    return response.text ?? "No response generated.";
  }
}

export default new GeminiService();