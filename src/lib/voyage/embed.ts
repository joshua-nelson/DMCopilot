import "server-only";

const VOYAGE_EMBEDDINGS_URL = "https://api.voyageai.com/v1/embeddings";
const DEFAULT_MODEL = "voyage-3-lite";

let warnedMissingKey = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

export async function embedTexts(
  texts: string[],
  model: string = DEFAULT_MODEL,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
      if (!warnedMissingKey) {
        warnedMissingKey = true;
        console.warn(
          "[voyage] VOYAGE_API_KEY is not set; embeddings disabled (FTS-only fallback).",
        );
      }
    return [];
  }

  const body = JSON.stringify({ input: texts, model });
  const backoffsMs = [200, 400, 800];

  let lastErr: unknown;
  for (let attempt = 0; attempt < 1 + backoffsMs.length; attempt += 1) {
    try {
      const res = await fetch(VOYAGE_EMBEDDINGS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const msg = `Voyage embeddings request failed: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`;

        if (res.status >= 400 && res.status < 500) {
          throw new Error(msg);
        }

        // 5xx: retry
        lastErr = new Error(msg);
      } else {
        const json: unknown = await res.json();
        const data =
          json && typeof json === "object"
            ? (json as Record<string, unknown>)["data"]
            : undefined;

        if (!Array.isArray(data)) {
          throw new Error("Voyage embeddings response malformed: missing data[]");
        }

        const embeddings: number[][] = [];
        for (const item of data) {
          const emb =
            item && typeof item === "object"
              ? (item as Record<string, unknown>)["embedding"]
              : undefined;
          if (!isNumberArray(emb)) {
            throw new Error(
              "Voyage embeddings response malformed: embedding is not number[]",
            );
          }
          embeddings.push(emb);
        }

        if (embeddings.length !== texts.length) {
          throw new Error(
            `Voyage embeddings response malformed: expected ${texts.length} embeddings, got ${embeddings.length}`,
          );
        }

        return embeddings;
      }
    } catch (err) {
      lastErr = err;
    }

    if (attempt < backoffsMs.length) {
      await sleep(backoffsMs[attempt]);
      continue;
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error("Voyage embeddings request failed");
}
