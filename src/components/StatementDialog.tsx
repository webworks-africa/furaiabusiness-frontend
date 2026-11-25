import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { X, FileSpreadsheet } from "lucide-react";
import {
  useAccounts,
  useCreateStatement,
  useSession,
} from "../application/queries";
import { statementFormSchema, type StatementForm } from "../domain/statements";
import { dayInNairobi } from "../domain/filters";
import type { Account } from "../api/contracts";
import { can } from "../auth/adapter";
import { Button } from "./ui/button";
import { StatePanel } from "./StatePanel";
export function StatementDialog({
  accountId,
  onClose,
}: {
  accountId?: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const accounts = useAccounts();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="statement-dialog"
      aria-labelledby="statement-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="dialog-heading">
        <div>
          <h2 id="statement-title">Export account statement</h2>
          <p>Choose an account and reporting date window.</p>
        </div>
        <Button
          variant="outline"
          disabled={busy}
          aria-label="Close statement dialog"
          onClick={onClose}
        >
          <X size={17} />
        </Button>
      </div>
      {accounts.isPending ? (
        <StatePanel />
      ) : accounts.error ? (
        <StatePanel
          error={accounts.error}
          retry={() => void accounts.refetch()}
        />
      ) : accounts.data.items.length ? (
        <StatementFormBody
          accounts={accounts.data.items}
          accountId={accountId}
          onBusyChange={setBusy}
          asOf={accounts.data.asOf}
          onClose={onClose}
        />
      ) : (
        <p className="notice">No accounts are available to export.</p>
      )}
    </dialog>
  );
}
function StatementFormBody({
  accounts,
  accountId,
  asOf,
  onBusyChange,
  onClose,
}: {
  accounts: Account[];
  accountId?: string;
  asOf: string;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
}) {
  const session = useSession();
  const allowed = can(session.data?.permissions ?? [], "statements:create");
  const create = useCreateStatement();
  const navigate = useNavigate();
  const today = dayInNairobi(asOf);
  const key = useRef({ body: "", key: "" });
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StatementForm>({
    resolver: zodResolver(statementFormSchema),
    defaultValues: {
      accountId: accounts.some((a) => a.id === accountId)
        ? accountId
        : accounts[0].id,
      from: today.slice(0, 8) + "01",
      to: today,
      format: "csv",
      includeUnresolved: true,
    },
  });
  function preset(last: boolean) {
    const d = new Date(today + "T00:00:00Z");
    if (last) {
      d.setUTCDate(0);
      setValue("to", d.toISOString().slice(0, 10));
      setValue("from", d.toISOString().slice(0, 8) + "01");
    } else {
      setValue("from", today.slice(0, 8) + "01");
      setValue("to", today);
    }
  }
  async function submit(values: StatementForm) {
    if (values.to > today) {
      setError("to", {
        message: "End date exceeds the available data snapshot",
      });
      return;
    }
    const body = JSON.stringify(values);
    if (key.current.body !== body)
      key.current = { body, key: crypto.randomUUID() };
    onBusyChange(true);
    try {
      const job = await create.mutateAsync({ values, key: key.current.key });
      onClose();
      navigate(`/statements/${job.id}`);
    } catch {
      /* Mutation exposes a safe, actionable error below. */
    } finally {
      onBusyChange(false);
    }
  }
  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(submit)(event);
      }}
      className="dialog-body"
    >
      <label htmlFor="statement-account">Operating ledger account</label>
      <select id="statement-account" {...register("accountId")}>
        {accounts.map((a) => (
          <option value={a.id} key={a.id}>
            {a.name} · {a.currency}
          </option>
        ))}
      </select>
      <p className="footnote">
        Snapshot: {today} · Dates use Africa/Nairobi (EAT).
      </p>
      <div className="preset-row">
        <Button type="button" variant="outline" onClick={() => preset(false)}>
          This month
        </Button>
        <Button type="button" variant="outline" onClick={() => preset(true)}>
          Last month
        </Button>
      </div>
      <div className="form-grid">
        <label>
          From date
          <input
            type="date"
            max={today}
            {...register("from")}
            aria-invalid={!!errors.from}
          />
        </label>
        <label>
          To date
          <input
            type="date"
            max={today}
            {...register("to")}
            aria-invalid={!!errors.to}
          />
        </label>
      </div>
      {Object.entries(errors).map(([field, error]) => (
        <p className="field-error" role="alert" key={field}>
          {error.message}
        </p>
      ))}
      <fieldset className="format-options">
        <legend>Document format</legend>
        <label className="format-card">
          <input type="radio" value="csv" {...register("format")} />
          <FileSpreadsheet size={22} />
          <strong>Reconciliation CSV ledger</strong>
          <small>
            Integer minor units, original references and posting status.
          </small>
        </label>
        <div className="format-card muted">
          <strong>Certified PDF</strong>
          <small>
            Unavailable until backend rendering and attestation are confirmed.
          </small>
        </div>
      </fieldset>
      <label className="checkbox-label">
        <input type="checkbox" {...register("includeUnresolved")} />
        Include pending and failed records with zero posted movement
      </label>
      <div className="notice">
        Only completed transactions affect opening and closing ledger balances.
        This export is a mock document, not a certified bank statement.
      </div>
      {!allowed && (
        <p role="alert" className="field-error">
          Your role cannot create or download statements.
        </p>
      )}
      {create.error && (
        <p role="alert" className="field-error">
          {create.error.message} Retrying the same request preserves its
          idempotency key.
        </p>
      )}
      <div className="dialog-actions">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button disabled={!allowed || isSubmitting}>
          {isSubmitting ? "Creating export…" : "Generate statement"}
        </Button>
      </div>
    </form>
  );
}
