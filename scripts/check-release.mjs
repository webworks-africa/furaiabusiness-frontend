import { readFileSync, readdirSync, existsSync } from "node:fs";
if (existsSync("dist/mockServiceWorker.js"))
  throw new Error("Mock service worker found in release");
for (const name of readdirSync("dist/assets")) {
  if (name.endsWith(".js")) {
    const content = readFileSync(`dist/assets/${name}`, "utf8");
    if (
      [
        "[MSW]",
        "mock-request-001",
        "__mock/collection-outcome",
        "__mock/provider/",
        "__mock/payouts/",
        "__mock/cards/",
        "Set simulated payout outcome",
        "Simulate issuer confirmation",
        "Approve simulated phone prompt",
        "__mock/refunds/",
        "Development outcome simulator",
      ].some((marker) => content.includes(marker))
    )
      throw new Error(`Mock handlers bundled: ${name}`);
  }
}
console.log("Release check passed: no mock worker or handlers.");
