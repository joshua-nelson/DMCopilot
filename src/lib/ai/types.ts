export type AIProvider = "openrouter";

export type AIChatRole = "system" | "user" | "assistant";

export type AIChatMessage = {
  role: AIChatRole;
  content: string;
};

export type ChatCompleteInput = {
  clerkUserId: string;
  feature: string;
  messages: AIChatMessage[];
  model?: string;
};

export type ChatCompleteResult = {
  provider: AIProvider;
  model: string;
  outputText: string;
  latencyMs: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};
