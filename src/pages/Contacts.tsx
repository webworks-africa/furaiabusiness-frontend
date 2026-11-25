import { money } from "../domain/money";
import { useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  contactFields,
  type Contact,
  type ContactFields,
} from "../api/billingContracts";
import {
  useContacts,
  useContact,
  useSaveContact,
} from "../application/billing";
import { useSession } from "../application/queries";
import { can } from "../auth/adapter";
import { Button } from "../components/ui/button";
import { StatePanel, Empty } from "../components/StatePanel";
import { Freshness } from "../components/Freshness";
import {
  Field,
  MutationMessage,
  VersionNotice,
} from "../components/BusinessForms";
import { BillingTable } from "../components/BillingTable";
export function ContactsPage() {
  const [p, set] = useSearchParams();
  const search = p.get("search") ?? "";
  const page = Math.max(1, Number(p.get("page")) || 1);
  const status = p.get("status") ?? "All";
  const q = useContacts(search, page, status);
  const s = useSession();
  const allowed = can(s.data?.permissions ?? [], "billing:write");
  const columns = useMemo<
    ColumnDef<Contact & { receivables: { KES: string; USD: string } }>[]
  >(
    () => [
      {
        header: "Customer / company",
        accessorKey: "name",
        cell: ({ row }) => (
          <Link to={`/customers/${row.original.id}`}>
            <strong>{row.original.name}</strong>
          </Link>
        ),
      },
      {
        header: "Primary contact & email",
        accessorKey: "person",
        cell: ({ row }) => (
          <>
            {row.original.person}
            <small className="block">{row.original.email}</small>
          </>
        ),
      },
      {
        header: "Payment terms",
        accessorKey: "termsDays",
        cell: ({ getValue }) => `Net ${getValue()}`,
      },
      {
        header: "Balance due by currency",
        accessorKey: "receivables",
        cell: ({ row }) => (
          <>
            {money(row.original.receivables.KES, "KES")}
            <small className="block">
              {money(row.original.receivables.USD, "USD")}
            </small>
          </>
        ),
      },
      {
        header: "Status",
        accessorKey: "archived",
        cell: ({ getValue }) => (getValue() ? "Archived" : "Active"),
      },
    ],
    [],
  );
  function update(key: string, value: string) {
    set((prev) => {
      prev.set(key, value);
      prev.delete("page");
      return prev;
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Customers & commercial contacts</h1>
          <p>Billing contacts and commercial terms</p>
        </div>
        {allowed && (
          <Button asChild>
            <Link to="/customers/new">New customer</Link>
          </Button>
        )}
      </div>
      <p className="notice">
        Billing contacts are distinct from registered banking customers. No
        credit limit or identity verification is implied.
      </p>
      <section className="panel">
        <div className="billing-filters">
          <label>
            Search customers
            <input
              value={search}
              onChange={(e) => update("search", e.target.value)}
            />
          </label>
          <label>
            Customer status
            <select
              value={status}
              onChange={(e) => update("status", e.target.value)}
            >
              {["All", "Active", "Archived"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        {q.isPending ? (
          <StatePanel />
        ) : q.error ? (
          <StatePanel error={q.error} retry={() => void q.refetch()} />
        ) : (
          <>
            <Freshness {...q.data} refresh={() => void q.refetch()} />
            {!q.data.items.length ? (
              <Empty
                title="No customers found"
                detail="Create a customer or change the filters."
              />
            ) : (
              <BillingTable
                items={q.data.items}
                columns={columns}
                label="Customers"
                page={page}
                pages={q.data.pages}
                total={q.data.total}
                onPage={(n) =>
                  set((prev) => {
                    prev.set("page", String(n));
                    return prev;
                  })
                }
              />
            )}
          </>
        )}
      </section>
    </>
  );
}
export function ContactPage() {
  const { id = "" } = useParams();
  const q = useContact(id === "new" ? "" : id);
  if (id !== "new" && q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  return <ContactEditor key={id} contact={id === "new" ? undefined : q.data} />;
}
function ContactEditor({ contact }: { contact?: Contact }) {
  const navigate = useNavigate();
  const session = useSession();
  const allowed = can(session.data?.permissions ?? [], "billing:write");
  const mutation = useSaveContact();
  const [version, setVersion] = useState(contact?.version ?? 1);
  const form = useForm<ContactFields>({
    resolver: zodResolver(contactFields),
    defaultValues: contact ?? {
      name: "",
      person: "",
      email: "",
      address: "",
      termsDays: "30",
      archived: false,
    },
  });
  async function submit(values: ContactFields) {
    try {
      const saved = await mutation.mutateAsync({
        ...values,
        id: contact?.id,
        version,
      });
      setVersion(saved.version);
      form.reset(saved);
      if (!contact) navigate(`/customers/${saved.id}`);
    } catch {
      /* Inline error. */
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{contact ? contact.name : "New customer"}</h1>
          <p>Commercial contact record</p>
        </div>
        <div className="action-row">
          <Link to="/customers">All customers →</Link>
          {contact && (
            <Link to={`/customers/${contact.id}/statement`}>
              Customer statement →
            </Link>
          )}
        </div>
      </div>
      {contact && (
        <VersionNotice
          local={version}
          server={contact.version}
          reload={() => {
            form.reset(contact);
            setVersion(contact.version);
          }}
        />
      )}
      <div className="two-grid">
        <section className="panel">
          <h2>Customer details</h2>
          {!allowed && <p className="notice">Read-only access</p>}
          <form onSubmit={form.handleSubmit(submit)}>
            <fieldset
              className="plain-fieldset"
              disabled={!allowed || mutation.isPending}
            >
              {(["name", "person", "email", "address"] as const).map((key) => (
                <Field
                  key={key}
                  id={`contact-${key}`}
                  label={
                    {
                      name: "Company / customer name",
                      person: "Primary contact name",
                      email: "Billing email",
                      address: "Billing address",
                    }[key]
                  }
                  error={form.formState.errors[key]?.message}
                >
                  <input
                    id={`contact-${key}`}
                    type={key === "email" ? "email" : "text"}
                    {...form.register(key)}
                  />
                </Field>
              ))}
              <Field id="terms-days" label="Payment terms">
                <select id="terms-days" {...form.register("termsDays")}>
                  {["0", "15", "30", "45", "60"].map((d) => (
                    <option key={d} value={d}>
                      Net {d}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="checkbox-label">
                <input type="checkbox" {...form.register("archived")} />
                Archive customer (exclude from new documents)
              </label>
              <Button disabled={!allowed || mutation.isPending}>
                Save customer
              </Button>
            </fieldset>
            <MutationMessage
              error={mutation.error}
              success={mutation.isSuccess ? "Customer saved." : undefined}
            />
          </form>
        </section>
        <section className="panel">
          <h2>Linked billing</h2>
          <p>
            Issued documents retain the customer snapshot captured at issue.
            Updating or archiving this contact does not rewrite them.
          </p>
          {contact && (
            <div className="action-row">
              <Button asChild variant="outline">
                <Link to={`/quotations?contactId=${contact.id}`}>
                  Customer quotations
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={`/invoices?contactId=${contact.id}`}>
                  Customer invoices
                </Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
