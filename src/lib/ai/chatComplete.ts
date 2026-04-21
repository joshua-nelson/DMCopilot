import "server-only";

import { getDefaultOpenRouterModel, getAIClient } from "@/lib/ai/client";
import { trackAICall } from "@/lib/ai/trackAICall";
import type { ChatCompleteInput, ChatCompleteResult } from "@/lib/ai/types";

export async function chatComplete(
  input: ChatCompleteInput,
): Promise<ChatCompleteResult> {
  const client = getAIClient();
  const model = input.model ?? getDefaultOpenRouterModel();

  const start = Date.now();
  const completion = await client.chat.completions.create({
    model,
    // Our internal message type is a subset of OpenAI's message schema.
    messages: input.messages,
  });
  const latencyMs = Date.now() - start;

  const outputText =
    completion.choices[0]?.message?.content &&
    typeof completion.choices[0].message.content === "string"
      ? completion.choices[0].message.content
      : "";

  const usage = completion.usage
    ? {
        inputTokens: completion.usage.prompt_tokens,
        outputTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
      }
    : undefined;

  await trackAICall({
    clerkUserId: input.clerkUserId,
    feature: input.feature,
    provider: "openrouter",
    model,
    inputTokens: usage?.inputTokens,
    outputTokens: usage?.outputTokens,
    // Stage 1: pricing/accounting not implemented (dev/test => 0).
    costUsd: 0,
    latencyMs,
  });

  return {
    provider: "openrouter",
    model,
    outputText,
    latencyMs,
    usage,
  };
}
