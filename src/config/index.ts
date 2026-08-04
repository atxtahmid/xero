import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  DISCORD_TOKEN: z.string().trim().min(1),

  CLIENT_ID: z.string().trim().min(1),

  DATABASE_URL: z.string().trim().min(1),

  GEMINI_API_KEY: z.string().trim().min(1),

  TAVILY_API_KEY: z.string().trim().optional(),

  OWNER_ID: z.string().trim().min(1),

  LAVALINK_HOST: z.string().trim().min(1),
  LAVALINK_PORT: z.coerce.number().int().positive(),
  LAVALINK_PASSWORD: z.string().trim().min(1),
  LAVALINK_SECURE: z
    .string()
    .trim()
    .optional()
    .transform((value) => value === "true"),

  NODE_ENV: z
    .enum([
      "development",
      "production",
      "test",
    ])
    .default("development"),
});

const env = envSchema.parse(process.env);

export type AppEnvironment =
  typeof env.NODE_ENV;

const config = Object.freeze({
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

  lavalink: {
    host: env.LAVALINK_HOST,
    port: env.LAVALINK_PORT,
    password: env.LAVALINK_PASSWORD,
    secure: env.LAVALINK_SECURE,
  },

  app: {
    name: "Xero",
    version: "1.0.0",
    environment: env.NODE_ENV,
  },

  isDevelopment:
    env.NODE_ENV === "development",

  isProduction:
    env.NODE_ENV === "production",
});

export default config;