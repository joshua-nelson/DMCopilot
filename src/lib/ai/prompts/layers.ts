export const PROMPT_LAYER_ORDER = [
  "static",
  "campaign",
  "session",
  "volatile",
] as const;

export type PromptLayerKey = (typeof PROMPT_LAYER_ORDER)[number];

export type PromptLayer = {
  key: PromptLayerKey;
  /** Plain text prompt content for this layer. */
  content: string;
  /** Whether this layer is intended to be cacheable by Anthropic prompt caching. */
  cacheable?: boolean;
  /** Intended cache TTL in seconds (future: maps to Anthropic ttl). */
  ttlSeconds?: number;
};

export type PromptLayerOptions = Pick<PromptLayer, "cacheable" | "ttlSeconds">;

export function promptLayerIndex(key: PromptLayerKey): number {
  return PROMPT_LAYER_ORDER.indexOf(key);
}

export function defaultPromptLayerOptions(key: PromptLayerKey): PromptLayerOptions {
  switch (key) {
    case "static":
      return { cacheable: true, ttlSeconds: 60 * 60 };
    case "campaign":
      return { cacheable: true, ttlSeconds: 5 * 60 };
    case "session":
      return { cacheable: true, ttlSeconds: 5 * 60 };
    case "volatile":
      return { cacheable: false };
  }
}
