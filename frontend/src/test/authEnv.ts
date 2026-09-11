/** Test-only auth channel: jsdom never forwards document.cookie to fetch. */

let testUserId: string | null = "user-1";

export const setTestUser = (id: string | null) => {
  testUserId = id;
};

export const getTestUser = () => testUserId;

export function installTestAuth() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const id = getTestUser();
    if (!id) return originalFetch(input, init);
    const headers = new Headers(init?.headers);
    if (!headers.has("x-test-user")) headers.set("x-test-user", id);
    return originalFetch(input, { ...init, headers });
  }) as typeof fetch;
}
