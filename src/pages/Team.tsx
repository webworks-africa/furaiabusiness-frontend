import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useTeam,
  useInvite,
  useInvitationAction,
  useMemberAccess,
} from "../application/business";
import { useSession } from "../application/queries";
import {
  invitationFieldsSchema,
  type InvitationFields,
  memberSchema,
} from "../api/businessContracts";
import type { z } from "zod";
import type { Role } from "../api/contracts";
import { rolePermissions, permissionLabels } from "../domain/access";
import { can } from "../auth/adapter";
import {
  Field,
  MutationMessage,
  VersionNotice,
  ActivityLog,
} from "../components/BusinessForms";
import { StatePanel, Empty } from "../components/StatePanel";
import { Freshness, StatusBadge } from "../components/Freshness";
import { Button } from "../components/ui/button";
export function TeamPage() {
  const q = useTeam();
  const session = useSession();
  const action = useInvitationAction();
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  const allowed = can(session.data?.permissions ?? [], "team:manage");
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Team & permissions</h1>
          <p>Business membership, scoped access and invitations</p>
        </div>
        <span className="badge">{q.data.members.length} members</span>
      </div>
      <Freshness {...q.data} refresh={() => void q.refetch()} />
      <div className="notice">
        Approval is separate from execution. A payment maker cannot approve
        their own payment.
        <Link to="/payments/approvals">Review payment approvals →</Link>
      </div>
      {!allowed && (
        <p className="notice">
          Your role can view the team but cannot manage access.
        </p>
      )}
      <section className="panel">
        <h2>Business members</h2>
        <p>
          Self-demotion/suspension and removing the last active administrator
          are blocked. Sandbox entitlement does not authorize production APIs.
        </p>
        <div className="member-list">
          {q.data.members.map((member) => (
            <MemberEditor
              key={member.id}
              member={member}
              teamVersion={q.data.version}
              self={member.id === session.data?.memberId}
              allowed={allowed}
              businessSandbox={q.data.developerSandbox}
            />
          ))}
        </div>
      </section>
      <div className="two-grid">
        <InviteForm version={q.data.version} allowed={allowed} />
        <section className="panel">
          <h2>Invitations</h2>
          <p>
            Mock records only; no emails or invitations are sent externally.
          </p>
          {!q.data.invitations.length ? (
            <Empty
              title="No invitations"
              detail="New invitations will appear here."
            />
          ) : (
            q.data.invitations.map((invite) => (
              <article className="invitation-item" key={invite.id}>
                <div className="section-heading">
                  <strong>{invite.name}</strong>
                  <StatusBadge status={invite.status} />
                </div>
                <p>
                  {invite.email} · {invite.role} · Attempt {invite.attempt}
                </p>
                <small>
                  Expires{" "}
                  {new Date(invite.expiresAt).toLocaleDateString("en-GB", {
                    timeZone: "Africa/Nairobi",
                  })}
                </small>
                {["Pending", "Expired"].includes(invite.status) && (
                  <div className="action-row">
                    <Button
                      variant="outline"
                      disabled={!allowed || action.isPending}
                      onClick={() =>
                        action.mutate({
                          id: invite.id,
                          action: "resend",
                          version: q.data.version,
                        })
                      }
                    >
                      Resend invitation
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!allowed || action.isPending}
                      onClick={() =>
                        action.mutate({
                          id: invite.id,
                          action: "revoke",
                          version: q.data.version,
                        })
                      }
                    >
                      Revoke invitation
                    </Button>
                  </div>
                )}
              </article>
            ))
          )}
          <MutationMessage
            error={action.error}
            success={
              action.isSuccess
                ? "Invitation record updated; no email sent."
                : undefined
            }
          />
        </section>
      </div>
      <section className="panel">
        <h2>Role permissions</h2>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Role permission matrix"
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Base scopes</th>
                <th scope="col">Developer access</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(rolePermissions).map(([role, permissions]) => (
                <tr key={role}>
                  <th scope="row">{role}</th>
                  <td>
                    {permissions
                      .map((permission) => permissionLabels[permission])
                      .join(" · ")}
                  </td>
                  <td>
                    {["admin", "developer"].includes(role)
                      ? "Requires business and member sandbox entitlement"
                      : "Not granted by this role"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Production access: not approved for this demo business. Backend
          authorization must enforce every scope.
        </p>
        <Link to="/onboarding/status">View business service eligibility →</Link>
      </section>
      <ActivityLog />
    </>
  );
}
function InviteForm({
  version,
  allowed,
}: {
  version: number;
  allowed: boolean;
}) {
  const mutation = useInvite();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvitationFields>({
    resolver: zodResolver(invitationFieldsSchema),
    defaultValues: { name: "", email: "", role: "viewer" },
  });
  async function submit(values: InvitationFields) {
    try {
      await mutation.mutateAsync({ ...values, version });
      reset();
    } catch {
      /* Error rendered below. */
    }
  }
  return (
    <section className="panel">
      <h2>Create team invitation</h2>
      <form onSubmit={handleSubmit(submit)}>
        <fieldset
          disabled={!allowed || isSubmitting}
          className="plain-fieldset"
        >
          <Field
            id="invite-name"
            label="Invitee name"
            error={errors.name?.message}
          >
            <input id="invite-name" {...register("name")} />
          </Field>
          <Field
            id="invite-email"
            label="Invitee email"
            error={errors.email?.message}
          >
            <input id="invite-email" type="email" {...register("email")} />
          </Field>
          <Field id="invite-role" label="Invitation role">
            <select id="invite-role" {...register("role")}>
              <option value="viewer">Viewer</option>
              <option value="finance">Finance</option>
              <option value="developer">Developer</option>
              <option value="admin">Administrator</option>
            </select>
          </Field>
        </fieldset>
        <p>
          Acceptance must be confirmed by the future authentication backend.
          Creating an invitation does not activate a member or API access.
        </p>
        <MutationMessage
          error={mutation.error}
          success={
            mutation.isSuccess
              ? "Mock invitation created. No email was sent."
              : undefined
          }
        />
        <Button disabled={!allowed || isSubmitting}>Create invitation</Button>
      </form>
    </section>
  );
}
function MemberEditor({
  member,
  teamVersion,
  self,
  allowed,
  businessSandbox,
}: {
  member: z.infer<typeof memberSchema>;
  teamVersion: number;
  self: boolean;
  allowed: boolean;
  businessSandbox: boolean;
}) {
  const [revision, setRevision] = useState(member.version);
  const [role, setRole] = useState<Role>(member.role);
  const [status, setStatus] = useState(member.status);
  const [sandbox, setSandbox] = useState(member.developerSandbox);
  const mutation = useMemberAccess();
  async function submit() {
    try {
      const saved = await mutation.mutateAsync({
        id: member.id,
        memberVersion: revision,
        version: teamVersion,
        role,
        status,
        developerSandbox: sandbox,
      });
      const changed = saved.members.find((m) => m.id === member.id)!;
      setRevision(changed.version);
      setRole(changed.role);
      setStatus(changed.status);
      setSandbox(changed.developerSandbox);
    } catch {
      /* Error rendered below. */
    }
  }
  function reload() {
    setRevision(member.version);
    setRole(member.role);
    setStatus(member.status);
    setSandbox(member.developerSandbox);
  }
  return (
    <article className="member-editor" aria-label={`Member ${member.name}`}>
      <div className="section-heading">
        <div>
          <h3>
            {member.name}
            {self ? " · You" : ""}
          </h3>
          <small>{member.email}</small>
        </div>
        <StatusBadge status={member.status} />
      </div>
      <VersionNotice local={revision} server={member.version} reload={reload} />
      <div className="member-controls">
        <label>
          Member role
          <select
            value={role}
            disabled={!allowed || self || mutation.isPending}
            onChange={(e) => {
              const next = e.target.value as Role;
              setRole(next);
              if (!["admin", "developer"].includes(next)) setSandbox(false);
            }}
          >
            <option value="admin">Administrator</option>
            <option value="finance">Finance</option>
            <option value="developer">Developer</option>
            <option value="viewer">Viewer</option>
          </select>
        </label>
        <label>
          Member status
          <select
            value={status}
            disabled={!allowed || self || mutation.isPending}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option>Active</option>
            <option>Suspended</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={sandbox}
            disabled={
              !allowed ||
              !businessSandbox ||
              !["admin", "developer"].includes(role) ||
              mutation.isPending
            }
            onChange={(e) => setSandbox(e.target.checked)}
          />
          Developer sandbox entitlement
        </label>
        <Button
          variant="outline"
          disabled={!allowed || mutation.isPending}
          onClick={() => void submit()}
        >
          Save access
        </Button>
      </div>
      <MutationMessage
        error={mutation.error}
        success={mutation.isSuccess ? "Member access saved." : undefined}
      />
    </article>
  );
}
