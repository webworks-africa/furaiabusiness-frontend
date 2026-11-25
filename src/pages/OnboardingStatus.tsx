import { useBusinessPreferences } from "../application/enterprise";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useOnboarding,
  useAccountRequests,
  useRequestAccount,
} from "../application/business";
import { useSession } from "../application/queries";
import { accountRequestFieldsSchema } from "../api/businessContracts";
import type { z } from "zod";
import { documentKinds } from "../api/businessContracts";
import { documentLabels, editableApplication } from "../domain/onboarding";
import { can } from "../auth/adapter";
import { Freshness, StatusBadge } from "../components/Freshness";
import { StatePanel, Empty } from "../components/StatePanel";
import { Button } from "../components/ui/button";
import { MutationMessage, Field } from "../components/BusinessForms";
export function OnboardingStatusPage() {
  const q = useOnboarding();
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  const a = q.data;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Application status & service eligibility</h1>
          <p>
            {a.values.legalName} · {a.id}
          </p>
        </div>
        <StatusBadge status={a.status} />
      </div>
      <Freshness {...a} refresh={() => void q.refetch()} />
      {a.reviewNote && (
        <div
          className={`notice ${a.status === "Approved" ? "" : "warning"}`}
          role="status"
        >
          {a.reviewNote}
        </div>
      )}
      <div className="two-grid">
        <div>
          <section className="panel">
            <h2>Application review timeline</h2>
            <ol className="timeline">
              {a.history.length ? (
                a.history.map((event, i) => (
                  <li key={i}>
                    <span className="timeline-marker">{i + 1}</span>
                    <div>
                      <strong>{event.label}</strong>
                      <small>
                        {new Date(event.at).toLocaleString("en-GB", {
                          timeZone: "Africa/Nairobi",
                        })}{" "}
                        EAT
                      </small>
                    </div>
                  </li>
                ))
              ) : (
                <Empty
                  title="Application is a draft"
                  detail="Complete the six sections and submit for review."
                />
              )}
            </ol>
            {editableApplication(a.status) && (
              <Button asChild>
                <Link
                  to={
                    a.status === "Changes requested"
                      ? "/onboarding?step=4"
                      : "/onboarding"
                  }
                >
                  {a.status === "Changes requested"
                    ? "Update requested documents"
                    : "Continue application"}
                </Link>
              </Button>
            )}
          </section>
          <section className="panel">
            <h2>Document requirements</h2>
            {documentKinds.map((kind) => {
              const doc = a.documents.find((d) => d.kind === kind);
              return (
                <div className="requirement-row" key={kind}>
                  <div>
                    {documentLabels[kind]}
                    {doc?.reason && (
                      <small className="field-error">{doc.reason}</small>
                    )}
                  </div>
                  <StatusBadge status={doc?.status ?? "Missing"} />
                </div>
              );
            })}
            <p>
              Received documents are metadata-only mock uploads. No external
              registry or identity checks run here.
            </p>
          </section>
        </div>
        <div>
          <section className="panel">
            <h2>Service eligibility</h2>
            <div className="eligibility-item">
              <strong>Business accounts</strong>
              <StatusBadge
                status={
                  a.bankingEligible ? "Eligible to request" : "Review required"
                }
              />
              <p>
                Approval permits an account request. Provisioning is a separate
                event.
              </p>
            </div>
            <div className="eligibility-item">
              <strong>Developer sandbox</strong>
              <StatusBadge
                status={
                  a.developerSandbox
                    ? "Separate entitlement active"
                    : "Not entitled"
                }
              />
              <p>
                Member role and sandbox entitlement must also permit access.
              </p>
            </div>
            <div className="eligibility-item">
              <strong>Production APIs & cards</strong>
              <StatusBadge status="Not approved" />
              <p>
                Business approval does not grant production credentials, payment
                rails or card issuance.
              </p>
            </div>
          </section>
          <section className="panel">
            <h2>Submitted entity record</h2>
            <dl className="record-fields">
              <div>
                <dt>Legal name</dt>
                <dd>{a.values.legalName}</dd>
              </div>
              <div>
                <dt>Tax identifier</dt>
                <dd>
                  {a.values.taxId.slice(0, 2)}•••••••{a.values.taxId.slice(-1)}
                </dd>
              </div>
              <div>
                <dt>Representative</dt>
                <dd>{a.values.representativeName}</dd>
              </div>
              <div>
                <dt>Submission</dt>
                <dd>
                  {a.submittedAt ? "Recorded for review" : "Not submitted"}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
      <AccountRequests eligible={a.bankingEligible} />
      <div className="notice">
        Demo bank accounts are independent fixtures. New accounts receive zero
        balances only when the development provisioning scenario confirms
        opening.
      </div>
    </>
  );
}
function AccountRequests({ eligible }: { eligible: boolean }) {
  const q = useAccountRequests();
  const session = useSession();
  const mutation = useRequestAccount();
  const key = useRef({ body: "", key: "" });
  const preferences = useBusinessPreferences();
  const allowed =
    eligible && can(session.data?.permissions ?? [], "onboarding:write");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof accountRequestFieldsSchema>>({
    resolver: zodResolver(accountRequestFieldsSchema),
    defaultValues: { name: "", currency: "KES" },
  });
  async function submit(values: z.infer<typeof accountRequestFieldsSchema>) {
    const body = JSON.stringify(values);
    if (body !== key.current.body)
      key.current = { body, key: crypto.randomUUID() };
    try {
      await mutation.mutateAsync({ ...values, key: key.current.key });
      reset();
      key.current = { body: "", key: "" };
    } catch {
      /* Error rendered below. */
    }
  }
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Account requests</h2>
          <p>No funds are created by requesting an account.</p>
        </div>
        <Link to="/accounts">View bank accounts →</Link>
      </div>
      {allowed ? (
        <form
          className="account-request-form"
          onSubmit={(e) => {
            void handleSubmit(submit)(e);
          }}
        >
          <Field
            id="request-name"
            label="Account name"
            error={errors.name?.message}
          >
            <input id="request-name" {...register("name")} />
          </Field>
          <Field id="request-currency" label="Account currency">
            <select id="request-currency" {...register("currency")}>
              <option>KES</option>
              <option disabled={preferences.data?.foreignAccounts === false}>
                USD
              </option>
            </select>
          </Field>
          <Button disabled={isSubmitting}>
            {isSubmitting ? "Requesting…" : "Request account"}
          </Button>
        </form>
      ) : (
        <p>
          Account requests require an approved application and onboarding
          permission.
        </p>
      )}
      <MutationMessage
        error={mutation.error}
        success={
          mutation.isSuccess
            ? "Account request recorded. Awaiting separate provisioning."
            : undefined
        }
      />
      {q.isPending ? (
        <StatePanel />
      ) : q.error ? (
        <StatePanel error={q.error} retry={() => void q.refetch()} />
      ) : !q.data.items.length ? (
        <p>No account requests yet.</p>
      ) : (
        q.data.items.map((item) => (
          <div className="export-item" key={item.id}>
            <div>
              <strong>
                {item.name} · {item.currency}
              </strong>
              <p>{item.id}</p>
              {item.accountId && (
                <Link to={`/accounts/${item.accountId}`}>
                  View opened account →
                </Link>
              )}
            </div>
            <StatusBadge status={item.status} />
          </div>
        ))
      )}
    </section>
  );
}
