import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  CLIENT_ID: z.string().min(1),

  DATABASE_URL: z.string().min(1),

  GEMINI_API_KEY: z.string().min(1),
  TAVILY_API_KEY: z.string().optional(),

  OWNER_ID: z.string().min(1),
});

const env = envSchema.parse(process.env);

const config = {
  discord: {
    token: env.DISCORD_TOKEN,
    clientId: env.CLIENT_ID,
  },

  database: {
    url: env.DATABASE_URL,
  },

  gemini: {
    apiKey: env.GEMINI_API_KEY,
  },

  tavily: {
  apiKey: env.TAVILY_API_KEY,
 },

  owner: {
    id: env.OWNER_ID,
  },

  app: {
    name: "Xero",
    version: "1.0.0",
  },
};

export default config;