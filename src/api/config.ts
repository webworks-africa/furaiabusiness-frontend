const mode = import.meta.env.VITE_API_MODE ?? "real";
if (mode !== "mock" && mode !== "real")
  throw new Error("VITE_API_MODE must be mock or real");
const base = import.meta.env.VITE_API_BASE_URL ?? "/api";
const url = new URL(base, window.location.origin);
if (
  !["http:", "https:"].includes(url.protocol) ||
  url.username ||
  url.password ||
  url.search ||
  url.hash
)
  throw new Error("Invalid API base URL");
export const config = {
  mock: import.meta.env.DEV && mode === "mock",
  baseUrl: url.href.replace(/\/$/, ""),
};

if (config.mock && !url.pathname.replace(/\/$/, "").endsWith("/api"))
  throw new Error("Mock mode requires an /api base path");
