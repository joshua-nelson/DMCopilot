import { createHash } from "node:crypto";

import type { PromptLayer, PromptLayerKey } from "@/lib/ai/prompts/layers";

/** Minimal Anthropic-compatible cache control type (SDK optional). */
export type AnthropicCacheControl = {
  type: "ephemeral";
  /** Anthropic supports e.g. "1h"; default is 5m when omitted. */
  ttl?: "1h" | string;
};

/** Minimal Anthropic-compatible text block type (SDK optional). */
export type AnthropicTextBlock = {
  type: "text";
  text: string;
  cache_control?: AnthropicCacheControl;
};

function ttlSecondsToAnthropicTtl(ttlSeconds: number | undefined): "1h" | undefined {
  // Anthropic's docs currently call out an optional 1-hour TTL; 5m is default.
  if (!ttlSeconds) return undefined;
  if (ttlSeconds >= 60 * 60) return "1h";
  return undefined;
}

function isNonEmptyText(text: string): boolean {
  return text.trim().length > 0;
}

/**
 * Inserts explicit Anthropic cache breakpoints at layer boundaries.
 *
 * Strategy:
 * - Each layer becomes a single `system` text block.
 * - Cacheable layers get `cache_control` attached to their block, so the prefix
 *   ending at that layer can be cached.
 * - Non-cacheable layers (e.g. volatile) do not get cache_control.
 */
export function layersToAnthropicSystemBlocks(layers: readonly PromptLayer[]): AnthropicTextBlock[] {
  const blocks: AnthropicTextBlock[] = layers.map((layer) => {
    const shouldCache = layer.cacheable !== false;
    const ttl = ttlSecondsToAnthropicTtl(layer.ttlSeconds);

    const block: AnthropicTextBlock = { type: "text", text: layer.content };

    // Anthropic: empty text blocks cannot be cached, so skip cache_control.
    if (shouldCache && isNonEmptyText(layer.content)) {
      block.cache_control = ttl ? { type: "ephemeral", ttl } : { type: "ephemeral" };
    }

    return block;
  });

  const breakpoints = blocks.filter((b) => b.cache_control);
  if (breakpoints.length > 4) {
    throw new Error(
      `Anthropic supports up to 4 explicit cache breakpoints; got ${breakpoints.length}.`,
    );
  }

  // Anthropic constraint: longer TTL breakpoints must appear before shorter.
  // We only emit 1h explicitly. If a 1h breakpoint appears after a non-1h
  // breakpoint, the request would be rejected; fail fast here.
  let seenNon1h = false;
  for (const b of blocks) {
    if (!b.cache_control) continue;
    if (b.cache_control.ttl === "1h") {
      if (seenNon1h) {
        throw new Error(
          "Invalid cache_control ordering: 1h breakpoints must precede 5m/default breakpoints.",
        );
      }
    } else {
      seenNon1h = true;
    }
  }

  return blocks;
}

/** No-op helper (OpenRouter/OpenAI have no prompt-cache breakpoints). */
export function layersToOpenRouterCacheSegments(layers: readonly PromptLayer[]): PromptLayer[] {
  return [...layers];
}

export type PromptSignatureInput = {
  layers: ReadonlyArray<{
    key: PromptLayerKey;
    content: string;
    cacheable?: boolean;
    ttlSeconds?: number;
  }>;
};

/** Deterministic SHA-256 signature for metrics/debugging. */
export function computePromptSignature(input: PromptSignatureInput): string {
  // Stable serialization: array order is meaningful; object key order is fixed.
  const normalized = input.layers.map((l) => ({
    key: l.key,
    content: l.content,
    cacheable: l.cacheable ?? undefined,
    ttlSeconds: l.ttlSeconds ?? undefined,
  }));

  const json = JSON.stringify({ layers: normalized });
  return createHash("sha256").update(json, "utf8").digest("hex");
}
