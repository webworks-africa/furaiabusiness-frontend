import { useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useOnboarding,
  useSaveDraft,
  useSubmitApplication,
  useDocumentUpload,
  useRemoveDocument,
} from "../application/business";
import { useSession } from "../application/queries";
import {
  draftFieldsSchema,
  documentKinds,
  type DraftFields,
  type Onboarding,
} from "../api/businessContracts";
import {
  onboardingSteps,
  documentLabels,
  stepIssues,
  applicationIssues,
  editableApplication,
} from "../domain/onboarding";
import { can } from "../auth/adapter";
import { Freshness, StatusBadge } from "../components/Freshness";
import { StatePanel } from "../components/StatePanel";
import { Button } from "../components/ui/button";
import {
  Field,
  MutationMessage,
  VersionNotice,
} from "../components/BusinessForms";
const fields: Record<
  number,
  { name: keyof DraftFields; label: string; type?: string }[]
> = {
  1: [
    { name: "legalName", label: "Registered legal business name" },
    { name: "registrationNumber", label: "Business registration number" },
    { name: "taxId", label: "Kenya tax identifier" },
  ],
  2: [
    { name: "address", label: "Operating street address" },
    { name: "city", label: "City / town" },
    { name: "postalCode", label: "Postal code" },
  ],
  3: [
    { name: "representativeName", label: "Representative full name" },
    {
      name: "representativeEmail",
      label: "Representative email",
      type: "email",
    },
    { name: "representativePhone", label: "Representative phone", type: "tel" },
    { name: "representativeTitle", label: "Representative title" },
  ],
};
export function OnboardingPage() {
  const q = useOnboarding();
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Business onboarding</h1>
          <p>
            Application {q.data.id} · Drafts and document metadata are
            development-only.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/onboarding/status">Application status</Link>
        </Button>
      </div>
      <Freshness {...q.data} refresh={() => void q.refetch()} />
      <DraftEditor
        record={q.data}
        reload={async () => {
          const next = await q.refetch();
          return next.data;
        }}
      />
    </>
  );
}
function DraftEditor({
  record,
  reload,
}: {
  record: Onboarding;
  reload: () => Promise<Onboarding | undefined>;
}) {
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const number = Number(params.get("step") ?? 1);
  const step =
    Number.isInteger(number) && number >= 1 && number <= 6 ? number : 1;
  const [revision, setRevision] = useState(record.version);
  const [notice, setNotice] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [documentBusy, setDocumentBusy] = useState(false);
  const save = useSaveDraft();
  const submit = useSubmitApplication();
  const navigate = useNavigate();
  const form = useForm<DraftFields>({
    resolver: zodResolver(draftFieldsSchema),
    defaultValues: record.values,
  });
  const editable =
    editableApplication(record.status) &&
    can(session.data?.permissions ?? [], "onboarding:write");
  const busy = save.isPending || submit.isPending || documentBusy;
  const values = form.watch();
  const completed = onboardingSteps.filter(
    (_, i) => !stepIssues(i + 1, values, record.documents).length,
  ).length;
  async function saveValues(advance: boolean) {
    setNotice("");
    setIssues([]);
    const current = form.getValues();
    if (advance) {
      const errors =
        step === 6
          ? applicationIssues(current, record.documents)
          : stepIssues(step, current, record.documents);
      if (errors.length) {
        setIssues(errors.map((i) => i.message));
        errors.forEach((i) => {
          if (i.field !== "documents")
            form.setError(i.field, { message: i.message });
        });
        return;
      }
    }
    if (!(await form.trigger())) return;
    try {
      const saved = await save.mutateAsync({
        version: revision,
        values: current,
      });
      setRevision(saved.version);
      form.reset(saved.values);
      if (advance && step === 6) {
        await submit.mutateAsync(saved.version);
        navigate("/onboarding/status");
      } else {
        setNotice(
          "Draft saved. No verification or account activation has occurred.",
        );
        if (advance) setParams({ step: String(Math.min(step + 1, 6)) });
      }
    } catch {
      /* Safe mutation errors render below; the form retains unsaved values. */
    }
  }
  async function reloadSaved() {
    const latest = await reload();
    if (latest) {
      setRevision(latest.version);
      form.reset(latest.values);
      setIssues([]);
      setNotice("Saved draft loaded.");
    }
  }
  return (
    <div className="onboarding-layout">
      <aside
        className="panel onboarding-progress"
        aria-label="Application steps"
      >
        <div className="eyebrow">Enterprise onboarding</div>
        <h2>{values.legalName || "Your business"}</h2>
        <p>{completed} of 6 sections complete</p>
        <progress
          max={6}
          value={completed}
          aria-label="Completed onboarding sections"
        />
        <ol>
          {onboardingSteps.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                aria-label={`Step ${i + 1}: ${label}`}
                aria-current={step === i + 1 ? "step" : undefined}
                disabled={busy}
                onClick={() => setParams({ step: String(i + 1) })}
              >
                <span>{i + 1}</span>
                <div>
                  {label}
                  <small>
                    {stepIssues(i + 1, values, record.documents).length
                      ? "Needs information"
                      : "Complete"}
                  </small>
                </div>
              </button>
            </li>
          ))}
        </ol>
        <p>
          Save draft persists your entered values. Uploads are received
          metadata, not verified identity or tax checks.
        </p>
      </aside>
      <section>
        <div className="panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Business application</div>
              <h2>
                Step {step} of 6: {onboardingSteps[step - 1]}
              </h2>
            </div>
            <StatusBadge status={record.status} />
          </div>
          {!editable && (
            <div className="notice">
              {editableApplication(record.status)
                ? "Your role can view this application but cannot edit it."
                : "This application is locked while under review or after a decision."}{" "}
              <Link to="/onboarding/status">View status →</Link>
            </div>
          )}
          <VersionNotice
            local={revision}
            server={record.version}
            reload={() => void reloadSaved()}
          />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveValues(true);
            }}
          >
            <fieldset disabled={!editable || busy} className="plain-fieldset">
              <div className="form-grid">
                {(fields[step] ?? []).map((field) => (
                  <Field
                    key={field.name}
                    id={field.name}
                    label={field.label}
                    error={form.formState.errors[field.name]?.message}
                  >
                    <input
                      id={field.name}
                      type={field.type ?? "text"}
                      {...form.register(field.name)}
                      aria-invalid={!!form.formState.errors[field.name]}
                    />
                  </Field>
                ))}
                {step === 1 && (
                  <Field id="entityType" label="Entity type">
                    <select id="entityType" {...form.register("entityType")}>
                      <option>Limited company</option>
                      <option>Sole proprietor</option>
                      <option>Partnership</option>
                    </select>
                  </Field>
                )}
                {step === 2 && (
                  <div>
                    <label>Country</label>
                    <p>
                      Kenya · Other jurisdictions await backend confirmation.
                    </p>
                  </div>
                )}
              </div>
              {step === 4 && (
                <div className="document-list">
                  {documentKinds.map((kind) => (
                    <DocumentUpload
                      key={kind}
                      kind={kind}
                      record={record}
                      onVersion={setRevision}
                      onBusy={setDocumentBusy}
                    />
                  ))}
                </div>
              )}
              {step === 5 && (
                <>
                  <Field
                    id="businessUse"
                    label="Intended business use"
                    error={form.formState.errors.businessUse?.message}
                  >
                    <textarea
                      id="businessUse"
                      rows={4}
                      {...form.register("businessUse")}
                    />
                  </Field>
                  <Field
                    id="monthlyVolume"
                    label="Estimated monthly transaction volume"
                    error={form.formState.errors.monthlyVolume?.message}
                  >
                    <select
                      id="monthlyVolume"
                      {...form.register("monthlyVolume")}
                    >
                      <option value="">Select a volume</option>
                      <option>Below KES 1 million</option>
                      <option>KES 1–10 million</option>
                      <option>Above KES 10 million</option>
                    </select>
                  </Field>
                  <p>
                    Estimates do not create a credit limit, enable rails or
                    authorize production API access.
                  </p>
                </>
              )}
              {step === 6 && (
                <>
                  <dl className="record-fields">
                    <div>
                      <dt>Registered business</dt>
                      <dd>{values.legalName}</dd>
                    </div>
                    <div>
                      <dt>Operating address</dt>
                      <dd>
                        {values.address}, {values.city}
                      </dd>
                    </div>
                    <div>
                      <dt>Representative</dt>
                      <dd>{values.representativeName}</dd>
                    </div>
                    <div>
                      <dt>Documents received</dt>
                      <dd>
                        {
                          record.documents.filter(
                            (d) => d.status === "Received",
                          ).length
                        }{" "}
                        / 4
                      </dd>
                    </div>
                    <div>
                      <dt>Business use</dt>
                      <dd>{values.businessUse}</dd>
                    </div>
                  </dl>
                  <label className="checkbox-label">
                    <input type="checkbox" {...form.register("declaration")} />I
                    am authorized to submit this application and confirm these
                    details are accurate.
                  </label>
                  <p>
                    Submission requests review. It does not verify KYB, approve
                    banking services or create an account.
                  </p>
                </>
              )}
            </fieldset>
            {issues.map((issue, i) => (
              <p role="alert" className="field-error" key={i}>
                {issue}
              </p>
            ))}
            <MutationMessage
              error={save.error || submit.error}
              success={notice}
            />
            <div className="wizard-actions">
              <Button
                type="button"
                variant="outline"
                disabled={busy || step === 1}
                onClick={() => setParams({ step: String(step - 1) })}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!editable || busy}
                onClick={() => void saveValues(false)}
              >
                Save draft
              </Button>
              <Button disabled={!editable || busy}>
                {busy
                  ? "Saving…"
                  : step === 6
                    ? "Submit for review"
                    : "Save & continue"}
              </Button>
            </div>
          </form>
        </div>
        <div className="notice">
          Existing banking screens contain independent demo fixtures. Onboarding
          alone never changes their balances.
        </div>
      </section>
    </div>
  );
}
function DocumentUpload({
  kind,
  record,
  onVersion,
  onBusy,
}: {
  kind: (typeof documentKinds)[number];
  record: Onboarding;
  onVersion: (n: number) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState("");
  const upload = useDocumentUpload();
  const remove = useRemoveDocument();
  const document = record.documents.find((d) => d.kind === kind);
  async function send() {
    if (!file) return;
    setLocalError("");
    if (
      !["application/pdf", "image/png", "image/jpeg"].includes(file.type) ||
      file.size === 0 ||
      file.size > 5 * 1024 * 1024
    ) {
      setLocalError(
        "Choose a non-empty PDF, PNG or JPEG no larger than 5 MiB.",
      );
      return;
    }
    onBusy(true);
    try {
      const saved = await upload.mutateAsync({
        file,
        kind,
        version: record.version,
      });
      onVersion(saved.version);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch {
      /* Error rendered below. */
    } finally {
      onBusy(false);
    }
  }
  async function erase() {
    if (!document) return;
    onBusy(true);
    try {
      const saved = await remove.mutateAsync({
        id: document.id,
        version: record.version,
      });
      onVersion(saved.version);
    } catch {
      /* Error rendered below. */
    } finally {
      onBusy(false);
    }
  }
  return (
    <article className="document-item">
      <div className="section-heading">
        <h3>{documentLabels[kind]}</h3>
        {document && <StatusBadge status={document.status} />}
      </div>
      {document && (
        <>
          <p>
            {document.name} · {Math.ceil(document.size / 1024)} KiB · Received,
            not independently verified
          </p>
          {document.reason && <p className="field-error">{document.reason}</p>}
        </>
      )}
      <label htmlFor={`upload-${kind}`}>Choose {kind} document</label>
      <input
        ref={fileInput}
        id={`upload-${kind}`}
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <small>PDF, PNG or JPEG · Up to 5 MiB · Use test files only</small>
      <div className="action-row">
        <Button
          type="button"
          variant="outline"
          disabled={!file || upload.isPending || remove.isPending}
          onClick={() => void send()}
        >
          {upload.isPending
            ? "Uploading…"
            : document
              ? "Replace document"
              : "Upload document"}
        </Button>
        {document && (
          <Button type="button" variant="outline" onClick={() => void erase()}>
            Remove document
          </Button>
        )}
      </div>
      <MutationMessage error={upload.error || remove.error} />
      {localError && (
        <p className="field-error" role="alert">
          {localError}
        </p>
      )}
    </article>
  );
}
