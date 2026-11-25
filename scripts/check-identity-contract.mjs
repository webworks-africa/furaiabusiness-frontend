import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
assert.equal(
  read("src/api/identityGenerated.ts"),
  read("future-phases/previous-platform/packages/contracts/src/generated.ts"),
  "Uploaded generated types changed; regenerate against a confirmed contract deliberately.",
);
assert.equal(
  read("contracts/previous-platform.openapi.json"),
  read("future-phases/previous-platform/contracts/openapi.json"),
  "Uploaded OpenAPI snapshot changed unexpectedly.",
);
const spec = JSON.parse(read("contracts/previous-platform.openapi.json"));
for (const method of ["get", "post", "delete"])
  assert.ok(spec.paths["/partner/v1/sessions"][method]);
assert.ok(spec.components.schemas.LoginRequest);
assert.ok(spec.components.schemas.Session);
console.log(
  "Uploaded identity contract and generated-type snapshots match. Backend integration remains unverified.",
);
