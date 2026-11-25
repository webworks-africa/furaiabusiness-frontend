// Volatile session metadata only. Never persist or log the server CSRF value.
let csrf: string | undefined;
export function setCsrf(value?: string) {
  csrf = value;
}
export function csrfHeaders(method = "GET"): Record<string, string> {
  return csrf && !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())
    ? { "X-CSRF-Token": csrf }
    : {};
}
