import "server-only";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { chatComplete } from "@/lib/ai/chatComplete";
import { getDefaultOpenRouterModel } from "@/lib/ai/client";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Unauthenticated" },
      { status: 401 },
    );
  }

  try {
    const result = await chatComplete({
      clerkUserId: userId,
      feature: "ai.ping",
      messages: [
        {
          role: "system",
          content:
            "You are a diagnostic endpoint. Respond with a short, plain-text 'pong' plus one brief sentence.",
        },
        { role: "user", content: "ping" },
      ],
    });

    return NextResponse.json({
      ok: true,
      model: result.model,
      output: result.outputText,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const maybeStatus =
      typeof err === "object" && err !== null && "status" in err
        ? (err as { status?: unknown }).status
        : undefined;

    const model = (() => {
      try {
        return getDefaultOpenRouterModel();
      } catch {
        return undefined;
      }
    })();

    const status = typeof maybeStatus === "number" ? maybeStatus : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
        model,
        status,
      },
      { status },
    );
  }
}
