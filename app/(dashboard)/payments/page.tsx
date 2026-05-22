import { QueryFilterForm } from "@/components/query-filter-form";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { formatCurrency, getUsdRates } from "@/lib/fx-rates";
import { listInvoices } from "@/lib/invoices";

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function toTime(value: string | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const session = await requireSession();
  const all = await listInvoices(session.user.id, session.user.role === "ADMIN");
  const rates = await getUsdRates();
  const q = String(params.q ?? "").trim().toLowerCase();
  const status = String(params.status ?? "all");
  const dueFrom = String(params.dueFrom ?? "");
  const dueTo = String(params.dueTo ?? "");
  const sort = String(params.sort ?? "amount_desc");
  const displayCurrency = String(params.currency ?? "USD").toUpperCase();
  const fromTime = toTime(dueFrom);
  const toTimeValue = toTime(dueTo);

  const convertFromInvoiceCurrency = (amount: number, sourceCurrency: string) => {
    const sourceRate = rates[(sourceCurrency || "USD").toUpperCase()];
    const targetRate = rates[displayCurrency] ?? rates.USD;
    if (!sourceRate || !targetRate) return amount;
    return (amount / sourceRate) * targetRate;
  };

  const invoices = all.filter((invoice) => {
    if (q && !`${invoice.invoiceNo} ${invoice.customer.name}`.toLowerCase().includes(q)) return false;
    if (status !== "all" && invoice.status !== status) return false;
    if (fromTime || toTimeValue) {
      if (!invoice.dueDate) return false;
      const due = invoice.dueDate.getTime();
      if (fromTime && due < fromTime) return false;
      if (toTimeValue && due > toTimeValue + 24 * 60 * 60 * 1000 - 1) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sort === "amount_asc") return convertFromInvoiceCurrency(a.total, a.currency) - convertFromInvoiceCurrency(b.total, b.currency);
    if (sort === "due_asc") return (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0);
    if (sort === "due_desc") return (b.dueDate?.getTime() ?? 0) - (a.dueDate?.getTime() ?? 0);
    return convertFromInvoiceCurrency(b.total, b.currency) - convertFromInvoiceCurrency(a.total, a.currency);
  });
  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
  const openInvoices = invoices.filter((invoice) => invoice.status === "sent" || invoice.status === "overdue");
  const paidAmount = paidInvoices.reduce((sum, invoice) => sum + convertFromInvoiceCurrency(invoice.total, invoice.currency), 0);
  const openAmount = openInvoices.reduce((sum, invoice) => sum + convertFromInvoiceCurrency(invoice.total, invoice.currency), 0);
  const currencyCodes = Object.keys(rates).sort();

  return (
    <>
      <section><p className="text-sm text-muted-foreground">Payments</p><h1 className="text-2xl font-semibold tracking-tight">Payment Monitor</h1></section>
      <QueryFilterForm className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-7">
        <input name="q" defaultValue={q} placeholder="Search invoice or customer" className="h-10 rounded-md border border-input bg-background px-3 text-sm xl:col-span-2" />
        <select name="status" defaultValue={status} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All statuses</option><option value="paid">Paid</option><option value="sent">Sent</option><option value="overdue">Overdue</option><option value="draft">Draft</option></select>
        <select name="currency" defaultValue={displayCurrency} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{currencyCodes.map((code) => <option key={code} value={code}>{code}</option>)}</select>
        <input name="dueFrom" type="date" defaultValue={dueFrom} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
        <input name="dueTo" type="date" defaultValue={dueTo} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
        <select name="sort" defaultValue={sort} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="amount_desc">Amount high-low</option><option value="amount_asc">Amount low-high</option><option value="due_desc">Due date desc</option><option value="due_asc">Due date asc</option></select>
        <Button type="submit" variant="info">Apply</Button>
      </QueryFilterForm>
      <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-lg border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Collected</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(paidAmount, displayCurrency)}</p></div><div className="rounded-lg border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Outstanding</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(openAmount, displayCurrency)}</p></div><div className="rounded-lg border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Payment rate</p><p className="mt-2 text-2xl font-semibold">{invoices.length > 0 ? `${Math.round((paidInvoices.length / invoices.length) * 100)}%` : "0%"}</p></div></section>
      <section className="rounded-lg border bg-card shadow-sm"><div className="border-b p-5"><h2 className="text-base font-semibold">Recent payment activity</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Invoice</th><th className="px-5 py-3 font-medium">Customer</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Due date</th><th className="px-5 py-3 text-right font-medium">Amount ({displayCurrency})</th></tr></thead><tbody className="divide-y">{invoices.length > 0 ? invoices.slice(0, 25).map((invoice) => <tr key={invoice.id} className="hover:bg-muted/40"><td className="px-5 py-4 font-medium">{invoice.invoiceNo}</td><td className="px-5 py-4 text-muted-foreground">{invoice.customer.name}</td><td className="px-5 py-4"><span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{invoice.status}</span></td><td className="px-5 py-4 text-muted-foreground">{invoice.dueDate ? dateFormatter.format(invoice.dueDate) : "-"}</td><td className="px-5 py-4 text-right font-medium">{formatCurrency(convertFromInvoiceCurrency(invoice.total, invoice.currency), displayCurrency)}</td></tr>) : <tr><td className="px-5 py-8 text-center text-muted-foreground" colSpan={5}>No payment records yet.</td></tr>}</tbody></table></div></section>
    </>
  );
}
