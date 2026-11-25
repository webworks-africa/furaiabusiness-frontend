import { it, expect } from "vitest";
import { z } from "zod";
import { http, HttpResponse } from "msw";
import { server } from "../test/setup";
import { request, ApiError } from "./http";
import { overviewSchema, transactionPageSchema } from "./contracts";
import { db } from "../mocks/store";
import { can } from "../auth/adapter";
it("uses the same HTTP boundary for fixtures and paginated state", async () => {
  const first = await request("/transactions?page=1", transactionPageSchema);
  const second = await request("/transactions?page=2", transactionPageSchema);
  expect(first.total).toBe(24);
  expect(first.items).toHaveLength(6);
  expect(second.items[0].status).toBe("Pending confirmation");
  expect(second.items[0].id).toBe("TXN-90234");
});
it("does not replace real errors with fixtures", async () => {
  db.scenario = "unavailable";
  await expect(
    request("/business/overview", overviewSchema),
  ).rejects.toMatchObject({ status: 503 });
});
it("rejects an invalid response contract", async () => {
  server.use(
    http.get("*/api/business/overview", () =>
      HttpResponse.json({ accounts: [] }),
    ),
  );
  await expect(
    request("/business/overview", overviewSchema),
  ).rejects.toBeInstanceOf(ApiError);
});
it("permissions do not imply developer access for every business", () => {
  expect(can(["banking:read"], "developer:read")).toBe(false);
});
it("resets the deterministic scenario over HTTP", async () => {
  db.scenario = "empty";
  db.role = "viewer";
  await request("/__mock/reset", z.object({ ok: z.boolean() }), {
    method: "POST",
  });
  expect(db.scenario).toBe("normal");
  expect(db.role).toBe("admin");
});

it("invalid JSON does not expose response content", async () => {
  server.use(
    http.get(
      "*/api/business/overview",
      () =>
        new HttpResponse("<private-response-data>", {
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
  const result = request("/business/overview", overviewSchema);
  await expect(result).rejects.toMatchObject({ status: 502 });
  await expect(result).rejects.not.toHaveProperty(
    "message",
    expect.stringContaining("private-response-data"),
  );
});
