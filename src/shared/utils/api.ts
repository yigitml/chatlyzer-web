/** Cookie requests share one rotation, and obsolete identity requests never retry. */
let refreshFlight: Promise<boolean> | null = null;
let identityEpoch = 0;
let listening = false;
function observeIdentity() {
  if (typeof window !== "undefined" && !listening) {
    listening = true;
    window.addEventListener("chatlyzer:session-changed", () => { identityEpoch++; });
  }
}

export function currentApiIdentity() { observeIdentity(); return identityEpoch; }
export function assertApiIdentity(expected: number) {
  if (expected !== identityEpoch) throw Object.assign(new Error("Session changed; obsolete request discarded"), { status: 409, obsolete: true });
}
// A browser applies Set-Cookie before resolving fetch. Login/logout wait for an
// existing rotation so its old Set-Cookie cannot arrive after the new identity.
export async function settleCookieRefresh() { await refreshFlight; }

export const createApiClient = (getToken: () => string | null) => {
  observeIdentity();
  const getDefaultHeaders = (isFileUpload = false) => {
    const headers: Record<string, string> = {};
    if (!isFileUpload) headers["Content-Type"] = "application/json";
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const handleResponse = async (response: Response) => {
    const contentType = response.headers.get("Content-Type") || "";
    if (response.ok) {
      if (contentType.includes("application/json")) {
        const body = await response.json();
        if (response.headers.has("X-Page-Limit")) {
          body.pageInfo = {
            limit: Number(response.headers.get("X-Page-Limit")),
            hasMore: response.headers.get("X-Has-More") === "true",
            nextCursor: response.headers.get("X-Next-Cursor"),
          };
        }
        return body;
      }
      if (contentType.includes("text/")) return response.text();
      return response.blob();
    }
    let errorData: any;
    try { errorData = await response.json(); }
    catch { errorData = { error: response.statusText || "Request failed" }; }
    const error = new Error(errorData.error || errorData.message || response.statusText || `HTTP ${response.status}`) as Error & { status: number; data: any };
    error.status = response.status;
    error.data = errorData;
    throw error;
  };

  const buildUrl = (endpoint: string, params?: Record<string, any>) => {
    const url = new URL(`/api${endpoint}`, "http://same-origin.invalid");
    if (params) Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) value.forEach(item => url.searchParams.append(`${key}[]`, String(item)));
        else url.searchParams.append(key, String(value));
      }
    });
    return `${url.pathname}${url.search}`;
  };

  const request = async (endpoint: string, method: string, data?: any, params?: Record<string, any>, extraHeaders?: Record<string,string>) => {
    observeIdentity();
    const epoch = identityEpoch;
    if (endpoint.startsWith("/auth/")) { await settleCookieRefresh(); assertApiIdentity(epoch); }
    const isFileUpload = typeof FormData !== "undefined" && data instanceof FormData;
    const init: RequestInit = {
      method, headers: { ...getDefaultHeaders(isFileUpload), ...extraHeaders }, credentials: "include",
      ...(data !== undefined ? { body: isFileUpload ? data : JSON.stringify(data) } : {}),
    };
    const url = buildUrl(endpoint, params);
    let response = await fetch(url, init);
    const assertIdentity = () => {
      assertApiIdentity(epoch);
    };
    assertIdentity();
    // Authentication rejection happens before the handler, so retrying once is safe.
    // Provider/payment errors are never retried here.
    if (response.status === 401 && (!endpoint.startsWith("/auth/") || endpoint === "/auth/web/logout") && !getToken()) {
      if (!refreshFlight) {
        refreshFlight = fetch("/api/auth/web/refresh", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        }).then(r => r.ok).catch(() => false).finally(() => { refreshFlight = null; });
      }
      const refreshed = await refreshFlight;
      assertIdentity();
      if (refreshed) response = await fetch(url, init);
      assertIdentity();
      if (!refreshed || response.status === 401) {
        if (typeof window !== "undefined") window.dispatchEvent(new Event("chatlyzer:session-expired"));
      }
    }
    const result = await handleResponse(response);
    assertIdentity();
    return result;
  };
  return {
    get: (endpoint: string, params?: Record<string, any>) => request(endpoint, "GET", undefined, params),
    post: (endpoint: string, data?: any, headers?: Record<string,string>) => request(endpoint, "POST", data, undefined, headers),
    put: (endpoint: string, data?: any) => request(endpoint, "PUT", data),
    delete: (endpoint: string, data?: any) => request(endpoint, "DELETE", data),
  };
};
export type ApiClient = ReturnType<typeof createApiClient>;
