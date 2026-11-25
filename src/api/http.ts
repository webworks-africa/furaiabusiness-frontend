import { csrfHeaders } from "../auth/csrf";
import type { z } from "zod";
import { config } from "./config";
export class ApiError extends Error {
  constructor(
    public status: number,
    public requestId: string | null,
  ) {
    super(
      status === 401
        ? "Your session has expired."
        : status === 404
          ? "The requested record could not be found."
          : status === 410
            ? "This download has expired. Generate a new statement."
            : status === 409
              ? "This action is not available in the current state. Refresh the record."
              : status === 422
                ? "The request could not be validated. Check your inputs."
                : status === 403
                  ? "You do not have permission to view this page."
                  : "The service is unavailable. Please try again.",
    );
  }
}
export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...csrfHeaders(options?.method),
      ...options?.headers,
    },
  });
  if (response.status === 401 && !path.startsWith("/partner/v1/sessions"))
    window.dispatchEvent(new Event("furaia-session-ended"));
  if (!response.ok)
    throw new ApiError(response.status, response.headers.get("X-Request-Id"));
  if (response.status === 204) {
    const parsed = schema.safeParse(undefined);
    if (parsed.success) return parsed.data;
    throw new ApiError(502, response.headers.get("X-Request-Id"));
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(502, response.headers.get("X-Request-Id"));
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success)
    throw new ApiError(502, response.headers.get("X-Request-Id"));
  return parsed.data;
}

// Only authenticated API-relative downloads; no backend-supplied redirect is followed.
export async function download(path: string, filename: string) {
  const response = await fetch(`${config.baseUrl}${path}`, {
    credentials: "include",
    redirect: "error",
  });
  if (response.status === 401 && !path.startsWith("/partner/v1/sessions"))
    window.dispatchEvent(new Event("furaia-session-ended"));
  if (!response.ok)
    throw new ApiError(response.status, response.headers.get("X-Request-Id"));
  if (!response.headers.get("Content-Type")?.startsWith("text/csv"))
    throw new ApiError(502, response.headers.get("X-Request-Id"));
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadBinary(
  path: string,
  filename: string,
  mime = "application/pdf",
) {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://"))
    throw new ApiError(422, null);
  const r = await fetch(`${config.baseUrl}${path}`, {
    credentials: "include",
    redirect: "error",
    cache: "no-store",
  });
  if (r.status === 401 && !path.startsWith("/public/"))
    window.dispatchEvent(new Event("furaia-session-ended"));
  if (!r.ok) throw new ApiError(r.status, r.headers.get("X-Request-Id"));
  const type = r.headers.get("Content-Type") ?? "";
  if (mime !== "original" && !type.startsWith(mime))
    throw new ApiError(502, null);
  const bytes = await r.arrayBuffer();
  if (
    mime === "application/pdf" &&
    new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-"
  )
    throw new ApiError(502, null);
  const url = URL.createObjectURL(new Blob([bytes], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/[^A-Za-z0-9._ -]/g, "_");
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
