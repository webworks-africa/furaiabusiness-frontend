import { enterprise } from "./enterpriseStore";
import { http, HttpResponse } from "msw";
import { z } from "zod";
import { guard, mockError } from "./handlers";
import { db, fixedDate } from "./store";
import { business, currentMember, record } from "./businessStore";
import {
  draftFieldsSchema,
  documentKindSchema,
  profileFieldsSchema,
  invitationFieldsSchema,
  policyFieldsSchema,
  accountRequestFieldsSchema,
} from "../api/businessContracts";
import { roleSchema, type Scenario } from "../api/contracts";
import { applicationIssues, editableApplication } from "../domain/onboarding";
import { freshness } from "./selectors";
const version = z.number().int().positive();
const json = <T extends object>(value: T) =>
  HttpResponse.json({ ...value, ...freshness() });
const team = () => json(business.team);
export function applyBusinessScenario(scenario: Scenario) {
  const application = business.onboarding;
  if (
    [
      "onboarding-approved",
      "onboarding-changes",
      "onboarding-rejected",
    ].includes(scenario) &&
    application.status === "In review"
  ) {
    application.status =
      scenario === "onboarding-approved"
        ? "Approved"
        : scenario === "onboarding-changes"
          ? "Changes requested"
          : "Rejected";
    application.version++;
    application.reviewNote =
      scenario === "onboarding-approved"
        ? "Approved by the development review simulator. No real KYB check was performed."
        : scenario === "onboarding-changes"
          ? "Provide a current proof of operating address."
          : "Application rejected by the development review simulator. Contact the service team outside this mock.";
    application.bankingEligible = application.status === "Approved";
    if (scenario === "onboarding-changes") {
      const doc = application.documents.find((d) => d.kind === "address");
      if (doc) {
        doc.status = "Changes requested";
        doc.reason = application.reviewNote;
      }
    }
    if (application.status === "Approved")
      business.profile.legalName = application.values.legalName;
    application.history.push({
      label: `Development review: ${application.status}`,
      at: fixedDate,
    });
    record(db.role, `Development review: ${application.status}`);
  }
  if (scenario === "no-developer-access") {
    business.team.developerSandbox = false;
    application.developerSandbox = false;
    business.team.version++;
  }
  if (scenario === "invitation-expired") {
    business.team.invitations
      .filter((i) => i.status === "Pending")
      .forEach((i) => (i.status = "Expired"));
    business.team.version++;
  }
  if (scenario === "invitation-accepted") {
    const invite = business.team.invitations.find(
      (i) => i.status === "Pending",
    );
    if (invite) {
      invite.status = "Accepted";
      business.team.members.push({
        id: `member_invited_${business.nextId++}`,
        version: 1,
        name: invite.name,
        email: invite.email,
        role: invite.role,
        status: "Active",
        developerSandbox: false,
      });
      business.team.version++;
      record(db.role, "Development simulator accepted an invitation");
    }
  }
  if (scenario === "account-provisioned" && application.bankingEligible) {
    const pending = business.requests.items.find(
      (i) => i.status === "Pending review",
    );
    if (pending) {
      const id = `acc_new_${business.nextId++}`;
      db.accounts.push({
        id,
        name: pending.name,
        currency: pending.currency,
        maskedNumber: `MOCK •••• ${String(9000 + business.nextId)}`,
        ledgerMinor: "0",
        heldMinor: "0",
        availableMinor: "0",
        status: "Active",
      });
      pending.status = "Opened";
      pending.accountId = id;
      record(
        db.role,
        "Development simulator provisioned a zero-balance account",
      );
    }
  }
}
export const businessHandlers = [
  http.get("*/api/business/profile", async () => {
    const e = await guard("business:read");
    return e ?? json(business.profile);
  }),
  http.patch("*/api/business/profile", async ({ request }) => {
    const e = await guard("business:manage");
    if (e) return e;
    const data = z
      .object({ version, values: profileFieldsSchema })
      .strict()
      .safeParse(await request.json());
    if (!data.success) return mockError(422);
    if (data.data.version !== business.profile.version) return mockError(409);
    business.profile.values = data.data.values;
    business.profile.version++;
    record(db.role, "Updated business operating profile");
    return json(business.profile);
  }),
  http.get("*/api/onboarding", async () => {
    const e = await guard("business:read");
    return e ?? json(business.onboarding);
  }),
  http.patch("*/api/onboarding/draft", async ({ request }) => {
    const e = await guard("onboarding:write");
    if (e) return e;
    const data = z
      .object({ version, values: draftFieldsSchema })
      .strict()
      .safeParse(await request.json());
    if (!data.success) return mockError(422);
    const app = business.onboarding;
    if (!editableApplication(app.status) || data.data.version !== app.version)
      return mockError(409);
    app.values = data.data.values;
    app.version++;
    record(db.role, "Saved onboarding draft");
    return json(app);
  }),
  http.post("*/api/onboarding/documents", async ({ request }) => {
    const e = await guard("onboarding:write");
    if (e) return e;
    if (db.scenario === "upload-failure") return mockError(503);
    const app = business.onboarding;
    if (!editableApplication(app.status)) return mockError(409);
    const form = await request.formData();
    const kind = documentKindSchema.safeParse(form.get("kind"));
    const file = form.get("file");
    if (
      !kind.success ||
      !file ||
      typeof file === "string" ||
      file.size === 0 ||
      file.size > 5 * 1024 * 1024
    )
      return mockError(422);
    if (Number(form.get("version")) !== app.version) return mockError(409);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const valid =
      file.type === "application/pdf"
        ? String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-"
        : file.type === "image/png"
          ? [137, 80, 78, 71, 13, 10, 26, 10].every((x, i) => bytes[i] === x)
          : file.type === "image/jpeg"
            ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            : false;
    if (!valid) return mockError(422);
    const name =
      file.name
        .split(/[\\/]/)
        .pop()!
        .split("")
        .filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127)
        .join("")
        .slice(0, 150) || "document";
    app.documents = app.documents.filter((d) => d.kind !== kind.data);
    app.documents.push({
      id: `DOC-${business.nextId++}`,
      kind: kind.data,
      name,
      size: file.size,
      mime: file.type,
      status: "Received",
      reason: null,
    });
    app.version++;
    record(db.role, `Received ${kind.data} document metadata`);
    return json(app);
  }),
  http.delete("*/api/onboarding/documents/:id", async ({ request, params }) => {
    const e = await guard("onboarding:write");
    if (e) return e;
    const app = business.onboarding;
    const data = z
      .object({ version })
      .strict()
      .safeParse(await request.json());
    if (!data.success) return mockError(422);
    if (!editableApplication(app.status) || data.data.version !== app.version)
      return mockError(409);
    if (!app.documents.some((d) => d.id === params.id)) return mockError(404);
    app.documents = app.documents.filter((d) => d.id !== params.id);
    app.version++;
    record(db.role, "Removed onboarding document metadata");
    return json(app);
  }),
  http.post("*/api/onboarding/submit", async ({ request }) => {
    const e = await guard("onboarding:write");
    if (e) return e;
    const data = z
      .object({ version })
      .strict()
      .safeParse(await request.json());
    if (!data.success) return mockError(422);
    const app = business.onboarding;
    if (!editableApplication(app.status) || data.data.version !== app.version)
      return mockError(409);
    if (applicationIssues(app.values, app.documents).length)
      return mockError(422);
    app.status = "In review";
    app.version++;
    app.submittedAt = fixedDate;
    app.reviewNote = null;
    app.history.push({
      label: "Application submitted for review",
      at: fixedDate,
    });
    record(db.role, "Submitted onboarding application");
    return json(app);
  }),
  http.get("*/api/account-requests", async () => {
    const e = await guard("business:read");
    return e ?? json(business.requests);
  }),
  http.post("*/api/account-requests", async ({ request }) => {
    const e = await guard("onboarding:write");
    if (e) return e;
    if (!business.onboarding.bankingEligible) return mockError(403);
    const data = accountRequestFieldsSchema.safeParse(await request.json());
    if (
      data.success &&
      data.data.currency === "USD" &&
      !enterprise.mandate.foreignAccounts
    )
      return mockError(403);
    if (!data.success) return mockError(422);
    const key = request.headers.get("Idempotency-Key");
    if (!key) return mockError(422);
    const mapKey = `account:${key}`;
    const body = JSON.stringify(data.data);
    const existing = db.idempotency.get(mapKey);
    if (existing)
      return existing.body === body ? json(business.requests) : mockError(409);
    if (
      business.requests.items.some(
        (i) => i.name.toLowerCase() === data.data.name.toLowerCase(),
      )
    )
      return mockError(409);
    const id = `REQ-ACC-${business.nextId++}`;
    business.requests.items.unshift({
      ...data.data,
      id,
      status: "Pending review",
      accountId: null,
      createdAt: fixedDate,
    });
    db.idempotency.set(mapKey, { body, id });
    record(db.role, "Requested a business account; no balance was created");
    return json(business.requests);
  }),
  http.get("*/api/team", async () => {
    const e = await guard("team:read");
    return e ?? team();
  }),
  http.post("*/api/team/invitations", async ({ request }) => {
    const e = await guard("team:manage");
    if (e) return e;
    const data = invitationFieldsSchema
      .extend({ version })
      .strict()
      .safeParse(await request.json());
    if (!data.success) return mockError(422);
    if (data.data.version !== business.team.version) return mockError(409);
    const email = data.data.email.toLowerCase();
    if (
      business.team.members.some((m) => m.email.toLowerCase() === email) ||
      business.team.invitations.some(
        (i) => i.email.toLowerCase() === email && i.status !== "Revoked",
      )
    )
      return mockError(409);
    business.team.invitations.unshift({
      id: `INVITE-${business.nextId++}`,
      name: data.data.name,
      email,
      role: data.data.role,
      status: "Pending",
      attempt: 1,
      expiresAt: "2026-10-28T08:00:00.000Z",
    });
    business.team.version++;
    record(db.role, "Created a mock team invitation; no email sent");
    return team();
  }),
  http.post(
    "*/api/team/invitations/:id/:action",
    async ({ params, request }) => {
      const e = await guard("team:manage");
      if (e) return e;
      const data = z
        .object({ version })
        .strict()
        .safeParse(await request.json());
      if (!data.success) return mockError(422);
      if (data.data.version !== business.team.version) return mockError(409);
      const invite = business.team.invitations.find((i) => i.id === params.id);
      if (!invite) return mockError(404);
      if (invite.status === "Accepted") return mockError(409);
      if (
        params.action === "resend" &&
        ["Pending", "Expired"].includes(invite.status)
      ) {
        invite.status = "Pending";
        invite.attempt++;
        invite.expiresAt = "2026-10-28T08:00:00.000Z";
      } else if (
        params.action === "revoke" &&
        ["Pending", "Expired"].includes(invite.status)
      )
        invite.status = "Revoked";
      else return mockError(409);
      business.team.version++;
      record(db.role, `Mock invitation ${params.action}; no email sent`);
      return team();
    },
  ),
  http.patch("*/api/team/members/:id", async ({ request, params }) => {
    const e = await guard("team:manage");
    if (e) return e;
    const data = z
      .object({
        version,
        memberVersion: version,
        role: roleSchema,
        status: z.enum(["Active", "Suspended"]),
        developerSandbox: z.boolean(),
      })
      .strict()
      .safeParse(await request.json());
    if (!data.success) return mockError(422);
    const member = business.team.members.find((m) => m.id === params.id);
    if (!member) return mockError(404);
    if (
      data.data.version !== business.team.version ||
      data.data.memberVersion !== member.version
    )
      return mockError(409);
    const removesAdmin =
      member.role === "admin" &&
      member.status === "Active" &&
      (data.data.role !== "admin" || data.data.status !== "Active");
    if (
      removesAdmin &&
      business.team.members.filter(
        (m) => m.role === "admin" && m.status === "Active",
      ).length <= 1
    )
      return mockError(409);
    if (
      member.id === currentMember(db.role).id &&
      (data.data.role !== member.role || data.data.status !== member.status)
    )
      return mockError(409);
    if (
      data.data.developerSandbox &&
      (!business.team.developerSandbox ||
        !["admin", "developer"].includes(data.data.role))
    )
      return mockError(403);
    Object.assign(member, {
      role: data.data.role,
      status: data.data.status,
      developerSandbox: data.data.developerSandbox,
      version: member.version + 1,
    });
    business.team.version++;
    record(db.role, "Changed team membership access");
    return team();
  }),
  http.get("*/api/security", async () => {
    const e = await guard("security:self");
    return (
      e ??
      json({
        ...business.security,
        sessions: business.security.sessions
          .filter((s) => s.owner === currentMember(db.role).id)
          .map((s) => ({
            id: s.id,
            device: s.device,
            location: s.location,
            current: s.current,
            status: s.status,
          })),
      })
    );
  }),
  http.patch("*/api/security/policy", async ({ request }) => {
    const e = await guard("security:manage");
    if (e) return e;
    const data = z
      .object({ version, values: policyFieldsSchema })
      .strict()
      .safeParse(await request.json());
    if (!data.success) return mockError(422);
    if (data.data.version !== business.security.version) return mockError(409);
    business.security.policy = data.data.values;
    business.security.version++;
    record(
      db.role,
      "Updated mock sign-in policy; authentication enforcement is not connected",
    );
    return json({
      ...business.security,
      sessions: business.security.sessions.filter(
        (s) => s.owner === currentMember(db.role).id,
      ),
    });
  }),
  http.delete("*/api/security/sessions/:id", async ({ params, request }) => {
    const e = await guard("security:self");
    if (e) return e;
    const data = z
      .object({ version })
      .strict()
      .safeParse(await request.json());
    if (!data.success) return mockError(422);
    const session = business.security.sessions.find(
      (s) => s.id === params.id && s.owner === currentMember(db.role).id,
    );
    if (!session) return mockError(404);
    if (session.current || data.data.version !== business.security.version)
      return mockError(409);
    session.status = "Revoked";
    business.security.version++;
    record(db.role, "Revoked another mock session");
    return json({
      ...business.security,
      sessions: business.security.sessions.filter(
        (s) => s.owner === currentMember(db.role).id,
      ),
    });
  }),
  http.get("*/api/business/activity", async () => {
    const e = await guard("business:read");
    return e ?? json({ items: business.audit });
  }),
];
