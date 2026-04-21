type MethodCall = {
  method:
    | "from"
    | "select"
    | "eq"
    | "in"
    | "order"
    | "insert"
    | "update"
    | "delete"
    | "limit"
    | "maybeSingle"
    | "single";
  args: unknown[];
};

export type SupabaseResponse<T = unknown> = {
  data: T;
  error: unknown | null;
};

export type SupabaseQueryRecord = {
  table: string;
  calls: MethodCall[];
  response: SupabaseResponse;
};

type QueryBuilder = {
  select: (...args: unknown[]) => QueryBuilder;
  eq: (...args: unknown[]) => QueryBuilder;
  in: (...args: unknown[]) => QueryBuilder;
  order: (...args: unknown[]) => QueryBuilder;
  insert: (...args: unknown[]) => QueryBuilder;
  update: (...args: unknown[]) => QueryBuilder;
  delete: (...args: unknown[]) => QueryBuilder;
  limit: (...args: unknown[]) => QueryBuilder;
  maybeSingle: (...args: unknown[]) => QueryBuilder;
  single: (...args: unknown[]) => QueryBuilder;
  then: (onFulfilled: (v: SupabaseResponse) => unknown, onRejected?: (e: unknown) => unknown) => Promise<unknown>;
};

function createThenableBuilder(record: SupabaseQueryRecord): QueryBuilder {
  const push = (method: MethodCall["method"], args: unknown[]) => {
    record.calls.push({ method, args });
  };

  const builder: Partial<QueryBuilder> = {};
  const chain = (method: MethodCall["method"]) =>
    (...args: unknown[]) => {
      push(method, args);
      return builder as QueryBuilder;
    };

  builder.select = chain("select");
  builder.eq = chain("eq");
  builder.in = chain("in");
  builder.order = chain("order");
  builder.insert = chain("insert");
  builder.update = chain("update");
  builder.delete = chain("delete");
  builder.limit = chain("limit");
  builder.maybeSingle = chain("maybeSingle");
  builder.single = chain("single");

  builder.then = (onFulfilled, onRejected) => {
    return Promise.resolve(record.response).then(onFulfilled, onRejected);
  };

  return builder as QueryBuilder;
}

export type SupabaseAdminMock = {
  client: { from: (table: string) => QueryBuilder };
  queries: SupabaseQueryRecord[];
  queueResponse: (table: string, ...responses: SupabaseResponse[]) => void;
  reset: () => void;
};

export function createSupabaseAdminMock(): SupabaseAdminMock {
  const queues = new Map<string, SupabaseResponse[]>();
  const queries: SupabaseQueryRecord[] = [];

  const popResponse = (table: string): SupabaseResponse => {
    const q = queues.get(table);
    if (!q || q.length === 0) return { data: null, error: null };
    return q.shift() ?? { data: null, error: null };
  };

  const client = {
    from(table: string) {
      const record: SupabaseQueryRecord = {
        table,
        calls: [{ method: "from", args: [table] }],
        response: popResponse(table),
      };
      queries.push(record);
      return createThenableBuilder(record);
    },
  };

  return {
    client,
    queries,
    queueResponse(table: string, ...responses: SupabaseResponse[]) {
      const existing = queues.get(table) ?? [];
      existing.push(...responses);
      queues.set(table, existing);
    },
    reset() {
      queues.clear();
      queries.splice(0, queries.length);
    },
  };
}

export function getQueryCalls(mock: SupabaseAdminMock, table: string) {
  return mock.queries.filter((q) => q.table === table);
}

export function hasEqCall(mock: SupabaseAdminMock, table: string, column: string, value: unknown) {
  return mock.queries
    .filter((q) => q.table === table)
    .some((q) => q.calls.some((c) => c.method === "eq" && c.args[0] === column && c.args[1] === value));
}
