import Link from "next/link";

import { InvoiceStatusSelect } from "@/components/invoice-status-select";
import { QueryFilterForm } from "@/components/query-filter-form";
import { requireSession } from "@/lib/auth/session";
import { listInvoices } from "@/lib/invoices";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const statusStyles: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  sent: "bg-sky-50 text-sky-700 ring-sky-600/20",
  overdue: "bg-rose-50 text-rose-700 ring-rose-600/20",
  draft: "bg-zinc-100 text-zinc-700 ring-zinc-600/20",
};

function toTime(value: string | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await requireSession();
  const allInvoices = await listInvoices(session.user.id, session.user.role === "ADMIN");

  const q = String(params.q ?? "").trim().toLowerCase();
  const status = String(params.status ?? "all");
  const customer = String(params.customer ?? "all");
  const dateFrom = String(params.dateFrom ?? "");
  const dateTo = String(params.dateTo ?? "");
  const sort = String(params.sort ?? "created_desc");

  const fromTime = toTime(dateFrom);
  const toTimeValue = toTime(dateTo);
  const customers = Array.from(new Set(allInvoices.map((invoice) => invoice.customer.name))).sort();

  const invoices = allInvoices
    .filter((invoice) => {
      if (q && !`${invoice.invoiceNo} ${invoice.customer.name}`.toLowerCase().includes(q)) {
        return false;
      }
      if (status !== "all" && invoice.status !== status) return false;
      if (customer !== "all" && invoice.customer.name !== customer) return false;
      const created = invoice.createdAt.getTime();
      if (fromTime && created < fromTime) return false;
      if (toTimeValue && created > toTimeValue + 24 * 60 * 60 * 1000 - 1) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "created_asc") return a.createdAt.getTime() - b.createdAt.getTime();
      if (sort === "due_asc") return (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0);
      if (sort === "due_desc") return (b.dueDate?.getTime() ?? 0) - (a.dueDate?.getTime() ?? 0);
      if (sort === "total_asc") return a.total - b.total;
      if (sort === "total_desc") return b.total - a.total;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const totalBilled = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const totalOutstanding = invoices
    .filter((invoice) => invoice.status === "sent" || invoice.status === "overdue")
    .reduce((sum, invoice) => sum + invoice.total, 0);

  return (
    <>
      <section className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Invoices</p>
          <h1 className="text-2xl font-semibold tracking-tight">Invoice Management</h1>
        </div>
      </section>

      <QueryFilterForm className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search invoice or customer"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm xl:col-span-2"
        />
        <select
          name="customer"
          defaultValue={customer}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All customers</option>
          {customers.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <input
          name="dateFrom"
          type="date"
          defaultValue={dateFrom}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        />
        <input
          name="dateTo"
          type="date"
          defaultValue={dateTo}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        />
        <select
          name="sort"
          defaultValue={sort}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="created_desc">Newest first</option>
          <option value="created_asc">Oldest first</option>
          <option value="due_desc">Due date desc</option>
          <option value="due_asc">Due date asc</option>
          <option value="total_desc">Amount high-low</option>
          <option value="total_asc">Amount low-high</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Apply
        </button>
      </QueryFilterForm>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total invoices</p>
          <p className="mt-2 text-2xl font-semibold">{invoices.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total billed</p>
          <p className="mt-2 text-2xl font-semibold">{currencyFormatter.format(totalBilled)}</p>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="mt-2 text-2xl font-semibold">{currencyFormatter.format(totalOutstanding)}</p>
        </div>
      </section>

      <section className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-base font-semibold">All invoices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium">Due</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Change</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-muted/40">
                    <td className="px-5 py-4 font-medium">{invoice.invoiceNo}</td>
                    <td className="px-5 py-4 text-muted-foreground">{invoice.customer.name}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {dateFormatter.format(invoice.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {invoice.dueDate ? dateFormatter.format(invoice.dueDate) : "-"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                          statusStyles[invoice.status] ?? statusStyles.draft
                        }`}
                      >
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <InvoiceStatusSelect invoiceId={invoice.id} status={invoice.status} />
                    </td>
                    <td className="px-5 py-4 text-right font-medium">
                      {currencyFormatter.format(invoice.total)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-3">
                        <a
                          href={`/api/invoices/${invoice.id}/export`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Export
                        </a>
                        <Link
                          href={`/invoices/${invoice.id}/edit`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-8 text-center text-muted-foreground" colSpan={8}>
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
