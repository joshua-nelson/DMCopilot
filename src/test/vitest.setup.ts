import { vi } from "vitest";

// Next.js server actions import this guard. In Vitest, we run in a plain Node
// environment, so we stub it to a no-op.
vi.mock("server-only", () => ({}));
