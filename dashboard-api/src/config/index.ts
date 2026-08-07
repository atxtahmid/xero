import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().trim().min(1),

  DISCORD_CLIENT_ID: z.string().trim().min(1),
  DISCORD_CLIENT_SECRET: z.string().trim().min(1),
  DISCORD_REDIRECT_URI: z.string().trim().min(1),

  JWT_SECRET: z.string().trim().min(32, "JWT_SECRET should be at least 32 characters."),

  OWNER_ID: z.string().trim().min(1),

  CORS_ORIGINS: z
    .string()
    .trim()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  PORT: z.coerce.number().int().positive().default(3001),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const env = envSchema.parse(process.env);

const config = Object.freeze({
  database: {
    url: env.DATABASE_URL,
  },

  discord: {
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    redirectUri: env.DISCORD_REDIRECT_URI,
  },

  jwt: {
    secret: env.JWT_SECRET,
  },

  owner: {
    id: env.OWNER_ID,
  },

  cors: {
    origins: env.CORS_ORIGINS,
  },

  port: env.PORT,

  app: {
    name: "Xero Dashboard API",
    version: "1.0.0",
    environment: env.NODE_ENV,
  },

  isDevelopment: env.NODE_ENV === "development",
  isProduction: env.NODE_ENV === "production",
});

export default config;
