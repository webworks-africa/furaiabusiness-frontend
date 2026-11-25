import { it, expect } from "vitest";
import {
  applicationIssues,
  stepIssues,
  editableApplication,
} from "./onboarding";
import { permissionsFor } from "./access";
import { business } from "../mocks/businessStore";
import { documentKinds, profileFieldsSchema } from "../api/businessContracts";
it("received documents and declaration are required, not invented verification", () => {
  expect(applicationIssues(business.onboarding.values, [])).toHaveLength(5);
  const documents = documentKinds.map((kind) => ({
    id: kind,
    kind,
    name: `${kind}.pdf`,
    mime: "application/pdf",
    size: 10,
    status: "Received" as const,
    reason: null,
  }));
  expect(
    applicationIssues(
      { ...business.onboarding.values, declaration: true },
      documents,
    ),
  ).toHaveLength(0);
  expect(
    applicationIssues(
      { ...business.onboarding.values, declaration: true },
      documents.map((d) => ({ ...d, status: "Changes requested" as const })),
    ),
  ).toHaveLength(4);
});
it("step validation checks identity and volume inputs", () => {
  expect(
    stepIssues(1, { ...business.onboarding.values, taxId: "invalid" }, [])[0]
      .field,
  ).toBe("taxId");
  expect(
    stepIssues(
      3,
      { ...business.onboarding.values, representativePhone: "0700" },
      [],
    )[0].field,
  ).toBe("representativePhone");
  expect(
    stepIssues(5, { ...business.onboarding.values, businessUse: "short" }, []),
  ).not.toHaveLength(0);
});
it("only draft and requested-change states are editable", () => {
  expect(editableApplication("Draft")).toBe(true);
  expect(editableApplication("Changes requested")).toBe(true);
  for (const state of ["In review", "Approved", "Rejected"] as const)
    expect(editableApplication(state)).toBe(false);
});
it("developer scope requires role plus both independent entitlements", () => {
  expect(permissionsFor("developer", false, true)).not.toContain(
    "developer:read",
  );
  expect(permissionsFor("developer", true, false)).not.toContain(
    "developer:read",
  );
  expect(permissionsFor("viewer", true, true)).not.toContain("developer:read");
  expect(permissionsFor("developer", true, true)).toContain("developer:read");
  expect(permissionsFor("developer", true, true)).not.toContain("banking:read");
  expect(permissionsFor("finance", false, false)).toContain(
    "statements:create",
  );
});
it("rejects unsafe business website schemes and embedded credentials", () => {
  for (const website of [
    "javascript:alert(1)",
    "http://example.test",
    "https://user:pass@example.test",
  ])
    expect(
      profileFieldsSchema.safeParse({ ...business.profile.values, website })
        .success,
    ).toBe(false);
  expect(
    profileFieldsSchema.safeParse({
      ...business.profile.values,
      website: "https://example.test",
    }).success,
  ).toBe(true);
});
