import { GoogleGenAI } from "@google/genai";

import config from "../config/index.js";

const ai = new GoogleGenAI({
  apiKey: config.gemini.apiKey,
});

class GeminiService {
  readonly model = "gemini-3.5-flash";

  async generate(prompt: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: this.model,
      contents: prompt,
    });

    return response.text ?? "No response generated.";
  }
}

export default new GeminiService();