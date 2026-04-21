import type { AIChatMessage } from "@/lib/ai/types";
import {
  defaultPromptLayerOptions,
  promptLayerIndex,
  type PromptLayer,
  type PromptLayerKey,
  type PromptLayerOptions,
} from "@/lib/ai/prompts/layers";
import {
  computePromptSignature,
  layersToAnthropicSystemBlocks,
  type AnthropicTextBlock,
} from "@/lib/ai/prompts/cache";

export type AnthropicRole = "user" | "assistant";

export type AnthropicMessage = {
  role: AnthropicRole;
  // Minimal representation: we only need text in Stage 2A.
  content: string;
};

export type AnthropicPrompt = {
  system: AnthropicTextBlock[];
  messages: AnthropicMessage[];
};

export class PromptBuilder {
  private readonly layersByKey = new Map<PromptLayerKey, PromptLayer>();
  private lastAddedIndex = -1;

  addLayer(key: PromptLayerKey, content: string, options: PromptLayerOptions = {}): this {
    const idx = promptLayerIndex(key);
    if (idx < 0) {
      // Exhaustiveness guard; should be unreachable under strict types.
      throw new Error(`Unknown prompt layer key: ${String(key)}`);
    }
    if (this.lastAddedIndex === -1 && key !== "static") {
      throw new Error(
        "PromptBuilder requires the first layer to be 'static' (stable→volatile ordering).",
      );
    }
    if (this.layersByKey.has(key)) {
      throw new Error(`Prompt layer already added: ${key}`);
    }
    if (idx < this.lastAddedIndex) {
      throw new Error(
        `Prompt layers must be added in order (static→campaign→session→volatile). Tried to add '${key}' after a later layer.`,
      );
    }

    const defaults = defaultPromptLayerOptions(key);
    const layer: PromptLayer = {
      key,
      content,
      cacheable: options.cacheable ?? defaults.cacheable,
      ttlSeconds: options.ttlSeconds ?? defaults.ttlSeconds,
    };

    this.layersByKey.set(key, layer);
    this.lastAddedIndex = idx;
    return this;
  }

  getLayers(): PromptLayer[] {
    return [...this.layersByKey.values()].sort(
      (a, b) => promptLayerIndex(a.key) - promptLayerIndex(b.key),
    );
  }

  getLayer(key: PromptLayerKey): PromptLayer | undefined {
    return this.layersByKey.get(key);
  }

  /**
   * Join stable layer contents into a single system prompt string (OpenRouter/OpenAI).
   *
   * Note: the `volatile` layer is intentionally excluded so it can be appended as
   * the final user message (better cache alignment).
   */
  buildSystemPrompt(): string {
    const parts = this.getLayers()
      .filter((l) => l.key !== "volatile")
      .map((l) => l.content)
      .filter((c) => c.trim().length > 0);
    return parts.join("\n\n");
  }

  /** Volatile, per-request content intended to be the final user message. */
  buildVolatileUserContent(): string {
    return this.getLayer("volatile")?.content ?? "";
  }

  /** OpenRouter/OpenAI chat messages. Builder supplies the system message. */
  buildOpenRouterMessages(conversation: readonly AIChatMessage[]): AIChatMessage[] {
    if (conversation.some((m) => m.role === "system")) {
      throw new Error(
        "Conversation messages must not include 'system' when using PromptBuilder (system is derived from layers).",
      );
    }

    const volatileUser = this.buildVolatileUserContent();
    if (volatileUser.trim().length > 0 && conversation.at(-1)?.role === "user") {
      throw new Error(
        "Conversation should exclude the current user turn when a non-empty 'volatile' layer is present.",
      );
    }

    const systemPrompt = this.buildSystemPrompt();
    const out: AIChatMessage[] = [];
    if (systemPrompt.trim().length > 0) out.push({ role: "system", content: systemPrompt });
    out.push(...conversation);
    if (volatileUser.trim().length > 0) out.push({ role: "user", content: volatileUser });
    return out;
  }

  /** Anthropic-ready prompt shape with explicit cache breakpoints in `system`. */
  buildAnthropicPrompt(conversation: readonly AIChatMessage[]): AnthropicPrompt {
    if (conversation.some((m) => m.role === "system")) {
      throw new Error(
        "Conversation messages must not include 'system' when building an Anthropic prompt (system is derived from layers).",
      );
    }

    const volatileUser = this.buildVolatileUserContent();
    if (volatileUser.trim().length > 0 && conversation.at(-1)?.role === "user") {
      throw new Error(
        "Conversation should exclude the current user turn when a non-empty 'volatile' layer is present.",
      );
    }

    const messages: AnthropicMessage[] = conversation.map((m) => {
      if (m.role === "user" || m.role === "assistant") {
        return { role: m.role, content: m.content };
      }
      // Should be unreachable due to the check above.
      throw new Error(`Unsupported role: ${m.role}`);
    });

    if (volatileUser.trim().length > 0) {
      messages.push({ role: "user", content: volatileUser });
    }

    const system = layersToAnthropicSystemBlocks(
      this.getLayers().filter((l) => l.key !== "volatile"),
    );

    return { system, messages };
  }

  /** Deterministic signature for metrics/debugging across providers. */
  signature(): string {
    return computePromptSignature({ layers: this.getLayers() });
  }
}
