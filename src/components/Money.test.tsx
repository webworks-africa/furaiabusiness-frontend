import { render, screen } from "@testing-library/react";
import { it, expect } from "vitest";
import { Money, moneyClass } from "./Money";
it("cash direction uses green incoming, red outgoing and neutral zero without number coercion", () => {
  expect(moneyClass("9007199254740993123")).toBe("money-incoming");
  expect(moneyClass("-12540")).toBe("money-outgoing");
  expect(moneyClass("12540", "outgoing")).toBe("money-outgoing");
  expect(moneyClass("0")).toBe("money-neutral");
  expect(moneyClass("12540", "neutral")).toBe("money-neutral");
  render(<Money minor="12540" currency="KES" direction="outgoing" />);
  expect(screen.getByText(/125.40/)).toHaveClass("money-outgoing");
});
