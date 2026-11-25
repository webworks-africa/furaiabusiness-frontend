import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useBusinessProfile,
  useSaveProfile,
  useSecurity,
  useSavePolicy,
  useRevokeSession,
} from "../application/business";
import { useSession } from "../application/queries";
import {
  profileFieldsSchema,
  policyFieldsSchema,
  type ProfileFields,
  type PolicyFields,
} from "../api/businessContracts";
import type { z } from "zod";
import { profileSchema, securitySchema } from "../api/businessContracts";
import { can } from "../auth/adapter";
import {
  Field,
  MutationMessage,
  VersionNotice,
  ActivityLog,
  SettingsNav,
} from "../components/BusinessForms";
import { StatePanel } from "../components/StatePanel";
import { Freshness, StatusBadge } from "../components/Freshness";
import { Button } from "../components/ui/button";
export function BusinessSettingsPage() {
  const q = useBusinessProfile();
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Business settings</h1>
          <p>Operating profile and contact details</p>
        </div>
      </div>
      <SettingsNav />
      <Freshness {...q.data} refresh={() => void q.refetch()} />
      <ProfileForm record={q.data} />
      <ActivityLog />
    </>
  );
}
function ProfileForm({ record }: { record: z.infer<typeof profileSchema> }) {
  const session = useSession();
  const allowed = can(session.data?.permissions ?? [], "business:manage");
  const [version, setVersion] = useState(record.version);
  const mutation = useSaveProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFields>({
    resolver: zodResolver(profileFieldsSchema),
    defaultValues: record.values,
  });
  async function submit(values: ProfileFields) {
    try {
      const saved = await mutation.mutateAsync({ version, values });
      setVersion(saved.version);
      reset(saved.values);
    } catch {
      /* Error rendered below. */
    }
  }
  return (
    <section className="panel">
      <h2>Business profile</h2>
      <p>
        Registered legal name: <strong>{record.legalName}</strong>. Legal
        identity changes require onboarding review.
      </p>
      <VersionNotice
        local={version}
        server={record.version}
        reload={() => {
          reset(record.values);
          setVersion(record.version);
        }}
      />
      {!allowed && (
        <p className="notice">
          Your role can view this profile but cannot edit it.
        </p>
      )}
      <form onSubmit={handleSubmit(submit)}>
        <fieldset
          className="plain-fieldset form-grid"
          disabled={!allowed || isSubmitting}
        >
          {(
            [
              { name: "displayName", label: "Business display name" },
              {
                name: "contactEmail",
                label: "Business contact email",
                type: "email",
              },
              { name: "phone", label: "Business contact phone", type: "tel" },
              { name: "website", label: "Website (HTTPS)" },
              { name: "operatingAddress", label: "Operating address" },
            ] as { name: keyof ProfileFields; label: string; type?: string }[]
          ).map((field) => (
            <Field
              key={field.name}
              id={field.name}
              label={field.label}
              error={errors[field.name]?.message}
            >
              <input
                id={field.name}
                type={field.type ?? "text"}
                {...register(field.name)}
                aria-invalid={!!errors[field.name]}
              />
            </Field>
          ))}
        </fieldset>
        <MutationMessage
          error={mutation.error}
          success={mutation.isSuccess ? "Business profile saved." : undefined}
        />
        <div className="dialog-actions">
          <Button disabled={!allowed || isSubmitting}>
            {isSubmitting ? "Saving…" : "Save business profile"}
          </Button>
        </div>
      </form>
    </section>
  );
}
export function SecuritySettingsPage() {
  const q = useSecurity();
  const revoke = useRevokeSession();
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Security & sessions</h1>
          <p>Policy preview and your development sessions</p>
        </div>
      </div>
      <SettingsNav />
      <Freshness {...q.data} refresh={() => void q.refetch()} />
      <div className="notice">
        These are mock policies and sessions. Real MFA, session enforcement and
        logout require the backend authentication adapter.
      </div>
      <PolicyForm record={q.data} />
      <section className="panel">
        <h2>Your sessions</h2>
        <p>
          Current session is protected; operational logout is not implemented
          here.
        </p>
        {q.data.sessions.map((s) => (
          <div className="export-item" key={s.id}>
            <div>
              <strong>{s.device}</strong>
              <p>
                {s.location} · {s.current ? "Current session" : "Other session"}
              </p>
            </div>
            <div className="action-row">
              <StatusBadge status={s.status} />
              {!s.current && (
                <Button
                  variant="outline"
                  disabled={s.status === "Revoked" || revoke.isPending}
                  onClick={() =>
                    revoke.mutate({ id: s.id, version: q.data.version })
                  }
                >
                  Revoke session
                </Button>
              )}
            </div>
          </div>
        ))}
        <MutationMessage
          error={revoke.error}
          success={revoke.isSuccess ? "Other mock session revoked." : undefined}
        />
      </section>
      <ActivityLog />
    </>
  );
}
function PolicyForm({ record }: { record: z.infer<typeof securitySchema> }) {
  const session = useSession();
  const allowed = can(session.data?.permissions ?? [], "security:manage");
  const [version, setVersion] = useState(record.version);
  const mutation = useSavePolicy();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<PolicyFields>({
    resolver: zodResolver(policyFieldsSchema),
    defaultValues: record.policy,
  });
  async function submit(values: PolicyFields) {
    try {
      const saved = await mutation.mutateAsync({ version, values });
      setVersion(saved.version);
      reset(saved.policy);
    } catch {
      /* Error rendered below. */
    }
  }
  return (
    <section className="panel">
      <h2>Business sign-in policy</h2>
      <p>
        Authentication state: {record.mfaStatus}. No actual MFA enrollment is
        claimed.
      </p>
      <VersionNotice
        local={version}
        server={record.version}
        reload={() => {
          setVersion(record.version);
          reset(record.policy);
        }}
      />
      <form onSubmit={handleSubmit(submit)}>
        <fieldset
          disabled={!allowed || isSubmitting}
          className="plain-fieldset"
        >
          <label className="checkbox-label">
            <input type="checkbox" {...register("requireMfa")} />
            Require MFA at sign-in (policy preview)
          </label>
          <label className="currency-picker">
            Idle session timeout
            <select
              {...register("sessionTimeoutMinutes", { valueAsNumber: true })}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </label>
        </fieldset>
        <MutationMessage
          error={mutation.error}
          success={
            mutation.isSuccess
              ? "Mock sign-in policy saved; enforcement is not connected."
              : undefined
          }
        />
        <Button disabled={!allowed || isSubmitting}>
          Save security policy
        </Button>
        {!allowed && (
          <p>Your role cannot change the business sign-in policy.</p>
        )}
      </form>
    </section>
  );
}
