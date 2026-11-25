import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./app/App";
import { config } from "./api/config";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "./styles.css";
import "./documents/paper.css";
async function start() {
  if (import.meta.env.DEV && config.mock) {
    const { worker } = await import("./mocks/browser");
    const { beginMockSession } = await import("./mocks/identityStore");
    const { db } = await import("./mocks/store");
    const { roleSchema } = await import("./api/contracts");
    try {
      const role = roleSchema.safeParse(
        sessionStorage.getItem("furaia.development.mock-member"),
      );
      if (role.success) {
        db.role = role.data;
        beginMockSession();
      }
    } catch {
      /* Storage is optional in development. */
    }
    await worker.start({
      quiet: true,
      onUnhandledRequest(request, print) {
        if (new URL(request.url).pathname.startsWith("/api/")) print.error();
      },
    });
  }
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
    },
  });
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
void start().catch(() => {
  document.getElementById("root")!.textContent =
    "Furaia could not start. Check environment configuration and reload.";
});
