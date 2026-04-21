import "server-only";

import OpenAI from "openai";

import { getAIConfig } from "@/lib/ai/config";

let cached: OpenAI | null = null;

export function getAIClient(): OpenAI {
  if (cached) return cached;

  const cfg = getAIConfig();
  const apiKey = cfg.openrouter.apiKey;
  if (!apiKey) {
    throw new Error(
      "Missing OPENROUTER_API_KEY. Set it in .env.local to use OpenRouter.",
    );
  }

  const defaultHeaders: Record<string, string> = {};
  if (cfg.openrouter.siteUrl) defaultHeaders["HTTP-Referer"] = cfg.openrouter.siteUrl;
  if (cfg.openrouter.siteName) defaultHeaders["X-Title"] = cfg.openrouter.siteName;

  cached = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders,
  });

  return cached;
}

export function getDefaultOpenRouterModel(): string {
  return getAIConfig().openrouter.model;
}
