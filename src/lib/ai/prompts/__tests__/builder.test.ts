import { describe, expect, it } from "vitest";

import { PromptBuilder } from "@/lib/ai/prompts/builder";
import { layersToAnthropicSystemBlocks } from "@/lib/ai/prompts/cache";
import type { AIChatMessage } from "@/lib/ai/types";

describe("PromptBuilder", () => {
  it("enforces layer ordering (static→campaign→session→volatile)", () => {
    const b1 = new PromptBuilder();
    expect(() => b1.addLayer("campaign", "campaign")).toThrow(/first layer.*static/i);

    const b2 = new PromptBuilder();
    b2.addLayer("static", "static");
    b2.addLayer("campaign", "campaign");
    expect(() => b2.addLayer("static", "static again")).toThrow(/already added/i);
    b2.addLayer("session", "session");
    expect(() => b2.addLayer("session", "session again")).toThrow(/already added/i);
    b2.addLayer("volatile", "volatile");

    const b3 = new PromptBuilder();
    b3.addLayer("static", "static");
    b3.addLayer("volatile", "volatile");
    expect(() => b3.addLayer("campaign", "campaign")).toThrow(/order/i);
  });

  it("formats OpenRouter messages with a single system message", () => {
    const pb = new PromptBuilder()
      .addLayer("static", "S")
      .addLayer("campaign", "C")
      .addLayer("volatile", "V");

    const conversation: AIChatMessage[] = [
      { role: "user", content: "Earlier question" },
      { role: "assistant", content: "Earlier answer" },
    ];

    const messages = pb.buildOpenRouterMessages(conversation);
    expect(messages).toEqual([
      { role: "system", content: "S\n\nC" },
      ...conversation,
      { role: "user", content: "V" },
    ]);
  });

  it("does not allow system messages in the conversation", () => {
    const pb = new PromptBuilder().addLayer("static", "S");
    expect(() =>
      pb.buildOpenRouterMessages([{ role: "system", content: "bad" }]),
    ).toThrow(/must not include 'system'/i);
  });
});

describe("cache breakpoints", () => {
  it("adds Anthropic cache_control breakpoints on cacheable layers", () => {
    const pb = new PromptBuilder()
      .addLayer("static", "S", { ttlSeconds: 3600 })
      .addLayer("campaign", "C", { ttlSeconds: 300 })
      .addLayer("session", "SESS", { ttlSeconds: 300 })
      .addLayer("volatile", "V", { cacheable: false });

    const systemBlocks = layersToAnthropicSystemBlocks(
      pb.getLayers().filter((l) => l.key !== "volatile"),
    );
    expect(systemBlocks).toHaveLength(3);
    expect(systemBlocks[0]?.cache_control).toEqual({ type: "ephemeral", ttl: "1h" });
    expect(systemBlocks[1]?.cache_control).toEqual({ type: "ephemeral" });
    expect(systemBlocks[2]?.cache_control).toEqual({ type: "ephemeral" });
  });
});
