import "server-only";

import { z } from "zod";

const envSchema = z
  .object({
    AI_MODE: z.enum(["dev", "prod"]).default("dev"),

    OPENROUTER_API_KEY: z.string().min(1).optional(),
    OPENROUTER_MODEL: z.string().min(1).default("google/gemma-4-31b-it:free"),
    OPENROUTER_SITE_URL: z.string().url().optional(),
    OPENROUTER_SITE_NAME: z.string().min(1).optional(),
  })
  .strict();

export type AIConfig = {
  aiMode: "dev" | "prod";
  openrouter: {
    apiKey?: string;
    model: string;
    siteUrl?: string;
    siteName?: string;
  };
};

let cached: AIConfig | null = null;

export function getAIConfig(): AIConfig {
  if (cached) return cached;

  const parsed = envSchema.safeParse({
    AI_MODE: process.env.AI_MODE,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    OPENROUTER_SITE_URL: process.env.OPENROUTER_SITE_URL,
    OPENROUTER_SITE_NAME: process.env.OPENROUTER_SITE_NAME,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "env"}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid AI env vars: ${issues}`);
  }

  cached = {
    aiMode: parsed.data.AI_MODE,
    openrouter: {
      apiKey: parsed.data.OPENROUTER_API_KEY,
      model: parsed.data.OPENROUTER_MODEL,
      siteUrl: parsed.data.OPENROUTER_SITE_URL,
      siteName: parsed.data.OPENROUTER_SITE_NAME,
    },
  };

  return cached;
}
