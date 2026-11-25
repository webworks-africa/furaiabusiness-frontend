import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, afterAll, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";
import { handlers } from "../mocks/handlers";
import { reset } from "../mocks/store";
import { beginMockSession } from "../mocks/identityStore";
beforeEach(() => beginMockSession());
export const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  reset();
});
afterAll(() => server.close());
