import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { it, expect } from "vitest";
import { Overview } from "./Overview";
import { db } from "../mocks/store";
function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
it("renders cash and receivables separately after loading", async () => {
  mount();
  expect(screen.getByRole("status")).toHaveTextContent("Loading");
  expect(await screen.findByText("Outstanding invoices")).toBeVisible();
  expect(
    screen.getByText(
      "Balances represent cash. Outstanding invoices are separate receivables.",
    ),
  ).toBeVisible();
});
it("shows a stale warning from server data", async () => {
  db.scenario = "stale";
  mount();
  expect(await screen.findByRole("status")).toBeVisible();
  expect(await screen.findByText(/Stale data ·/)).toBeVisible();
});
it("renders empty account state without a fabricated balance", async () => {
  db.scenario = "empty";
  mount();
  expect(await screen.findByText("No accounts yet")).toBeVisible();
  expect(screen.queryByText("Available balance")).not.toBeInTheDocument();
});
