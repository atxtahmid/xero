import { GoogleGenAI } from "@google/genai";

import config from "../config/index.js";

const ai = new GoogleGenAI({
  apiKey: config.gemini.apiKey,
});

class GeminiService {
  private model: string | null = null;

  private async getModel(): Promise<string> {
    if (this.model) {
      return this.model;
    }

    const models = await ai.models.list();

    console.log("===== AVAILABLE GEMINI MODELS =====");

    for (const model of models) {
      console.log(model.name);

      if (
        model.name.includes("gemini") &&
        !this.model
      ) {
        this.model = model.name.replace("models/", "");
      }
    }

    console.log("===================================");

    if (!this.model) {
      throw new Error("No compatible Gemini model found.");
    }

    console.log(`Using Gemini model: ${this.model}`);

    return this.model;
  }

  async generate(prompt: string): Promise<string> {
    const model = await this.getModel();

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text ?? "No response generated.";
  }
}

export default new GeminiService();