export class RedirectError extends Error {
  readonly url: string;

  constructor(url: string) {
    super(`NEXT_REDIRECT: ${url}`);
    this.name = "RedirectError";
    this.url = url;
  }
}

export function createRedirectMock() {
  const redirect = (url: string): never => {
    throw new RedirectError(url);
  };

  return { redirect };
}
