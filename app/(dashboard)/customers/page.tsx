import { QueryFilterForm } from "@/components/query-filter-form";
import { Button } from "@/components/ui/button";
import { convertManyToCurrency, formatCurrency, getUsdRates } from "@/lib/fx-rates";
import { requireSession } from "@/lib/auth/session";
import { listInvoices } from "@/lib/invoices";

type CustomerSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  invoices: number;
  entries: Array<{ amount: number; currency: string }>;
  totalBilled: number;
};

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const session = await requireSession();
  const invoices = await listInvoices(session.user.id, session.user.role === "ADMIN");
  const rates = await getUsdRates();
  const q = String(params.q ?? "").trim().toLowerCase();
  const minInvoices = Number(params.minInvoices ?? "0") || 0;
  const sort = String(params.sort ?? "billed_desc");
  const displayCurrency = String(params.currency ?? "USD").toUpperCase();

  const map = new Map<string, CustomerSummary>();
  for (const invoice of invoices) {
    const key = invoice.customer.id;
    const existing = map.get(key);
    if (existing) {
      existing.invoices += 1;
      existing.entries.push({ amount: invoice.total, currency: invoice.currency || "USD" });
      continue;
    }
    map.set(key, {
      id: invoice.customer.id,
      name: invoice.customer.name,
      email: invoice.customer.email ?? "-",
      phone: invoice.customer.phone ?? "-",
      invoices: 1,
      entries: [{ amount: invoice.total, currency: invoice.currency || "USD" }],
      totalBilled: 0,
    });
  }

  const customerValues = await Promise.all(
    Array.from(map.values()).map(async (customer) => ({
      ...customer,
      totalBilled: await convertManyToCurrency(customer.entries, displayCurrency),
    }))
  );

  const customers = customerValues
    .filter((c) => (c.invoices >= minInvoices) && (!q || `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q)))
    .sort((a, b) => {
    if (sort === "name_asc") return a.name.localeCompare(b.name);
    if (sort === "name_desc") return b.name.localeCompare(a.name);
    if (sort === "invoice_desc") return b.invoices - a.invoices;
    if (sort === "invoice_asc") return a.invoices - b.invoices;
    if (sort === "billed_asc") return a.totalBilled - b.totalBilled;
    return b.totalBilled - a.totalBilled;
  });
  const currencyCodes = Object.keys(rates).sort();

  return (
    <>
      <section><p className="text-sm text-muted-foreground">Customers</p><h1 className="text-2xl font-semibold tracking-tight">Customer Insights</h1></section>
      <QueryFilterForm className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-6">
        <input name="q" defaultValue={q} placeholder="Search name, email, phone" className="h-10 rounded-md border border-input bg-background px-3 text-sm xl:col-span-2" />
        <input name="minInvoices" type="number" min="0" defaultValue={String(minInvoices)} placeholder="Min invoices (0+)" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
        <select name="currency" defaultValue={displayCurrency} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          {currencyCodes.map((code) => <option key={code} value={code}>{code}</option>)}
        </select>
        <select name="sort" defaultValue={sort} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="billed_desc">Highest billed</option><option value="billed_asc">Lowest billed</option><option value="invoice_desc">Most invoices</option><option value="invoice_asc">Least invoices</option><option value="name_asc">Name A-Z</option><option value="name_desc">Name Z-A</option></select>
        <Button type="submit" variant="info">Apply</Button>
      </QueryFilterForm>
      <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-lg border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Total customers</p><p className="mt-2 text-2xl font-semibold">{customers.length}</p></div><div className="rounded-lg border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Average invoices/customer</p><p className="mt-2 text-2xl font-semibold">{customers.length > 0 ? (invoices.length / customers.length).toFixed(1) : "0.0"}</p></div><div className="rounded-lg border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Top customer billed</p><p className="mt-2 text-2xl font-semibold">{customers[0] ? formatCurrency(customers[0].totalBilled, displayCurrency) : formatCurrency(0, displayCurrency)}</p></div></section>
      <section className="rounded-lg border bg-card shadow-sm"><div className="border-b p-5"><h2 className="text-base font-semibold">Customer list</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Name</th><th className="px-5 py-3 font-medium">Email</th><th className="px-5 py-3 font-medium">Phone</th><th className="px-5 py-3 text-right font-medium">Invoices</th><th className="px-5 py-3 text-right font-medium">Total billed ({displayCurrency})</th></tr></thead><tbody className="divide-y">{customers.length > 0 ? customers.map((customer) => <tr key={customer.id} className="hover:bg-muted/40"><td className="px-5 py-4 font-medium">{customer.name}</td><td className="px-5 py-4 text-muted-foreground">{customer.email}</td><td className="px-5 py-4 text-muted-foreground">{customer.phone}</td><td className="px-5 py-4 text-right">{customer.invoices}</td><td className="px-5 py-4 text-right font-medium">{formatCurrency(customer.totalBilled, displayCurrency)}</td></tr>) : <tr><td className="px-5 py-8 text-center text-muted-foreground" colSpan={5}>No customers yet.</td></tr>}</tbody></table></div></section>
    </>
  );
}
