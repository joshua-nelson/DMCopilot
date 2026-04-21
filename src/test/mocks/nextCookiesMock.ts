export type CookieValue = { name: string; value: string };

export type CookieSetOptions = {
  path?: string;
  maxAge?: number;
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
};

export type CookieStoreMock = {
  get: (name: string) => CookieValue | undefined;
  set: (name: string, value: string, options?: CookieSetOptions) => void;
  delete: (name: string) => void;
  _dump: () => Record<string, { value: string; options?: CookieSetOptions }>;
  _setCalls: Array<{ name: string; value: string; options?: CookieSetOptions }>;
};

export function createCookieStoreMock(initial?: Record<string, string>): CookieStoreMock {
  const jar = new Map<string, { value: string; options?: CookieSetOptions }>();
  for (const [k, v] of Object.entries(initial ?? {})) {
    jar.set(k, { value: v });
  }

  const store: CookieStoreMock = {
    _setCalls: [],
    get(name: string) {
      const rec = jar.get(name);
      if (!rec) return undefined;
      return { name, value: rec.value };
    },
    set(name: string, value: string, options?: CookieSetOptions) {
      store._setCalls.push({ name, value, options });
      jar.set(name, { value, options });
    },
    delete(name: string) {
      jar.delete(name);
    },
    _dump() {
      return Object.fromEntries(jar.entries());
    },
  };

  return store;
}
