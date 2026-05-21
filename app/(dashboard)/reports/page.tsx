import { QueryFilterForm } from "@/components/query-filter-form";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { convertManyToCurrency, formatCurrency, getUsdRates } from "@/lib/fx-rates";
import { listInvoices } from "@/lib/invoices";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const session = await requireSession();
  const all = await listInvoices(session.user.id, session.user.role === "ADMIN");
  const rates = await getUsdRates();
  const scope = String(params.scope ?? "all");
  const year = Number(params.year ?? new Date().getFullYear());
  const sort = String(params.sort ?? "month_asc");
  const displayCurrency = String(params.currency ?? "USD").toUpperCase();
  const filtered = all.filter((invoice) => {
    if (invoice.createdAt.getFullYear() !== year) return false;
    if (scope === "paid") return invoice.status === "paid";
    if (scope === "open") return invoice.status === "sent" || invoice.status === "overdue";
    return true;
  });
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthTotals = Array.from({ length: 12 }, () => 0);
  for (const invoice of filtered) {
    const sourceRate = rates[(invoice.currency || "USD").toUpperCase()];
    const targetRate = rates[displayCurrency] ?? rates.USD;
    if (!sourceRate || !targetRate) {
      monthTotals[invoice.createdAt.getMonth()] += invoice.total;
      continue;
    }
    monthTotals[invoice.createdAt.getMonth()] += (invoice.total / sourceRate) * targetRate;
  }
  const monthRows = monthLabels.map((label, index) => ({ label, total: monthTotals[index], idx: index }));
  if (sort === "value_desc") monthRows.sort((a, b) => b.total - a.total);
  if (sort === "value_asc") monthRows.sort((a, b) => a.total - b.total);
  if (sort === "month_desc") monthRows.sort((a, b) => b.idx - a.idx);
  if (sort === "month_asc") monthRows.sort((a, b) => a.idx - b.idx);
  const maxMonthTotal = Math.max(...monthRows.map((m) => m.total), 1);
  const revenue = await convertManyToCurrency(
    filtered.filter((i) => i.status === "paid").map((invoice) => ({
      amount: invoice.total,
      currency: invoice.currency || "USD",
    })),
    displayCurrency
  );
  const totalIssuedValue = await convertManyToCurrency(
    filtered.map((invoice) => ({
      amount: invoice.total,
      currency: invoice.currency || "USD",
    })),
    displayCurrency
  );
  const averageInvoice = filtered.length ? totalIssuedValue / filtered.length : 0;
  const years = Array.from(new Set(all.map((i) => i.createdAt.getFullYear()))).sort((a, b) => b - a);
  const currencyCodes = Object.keys(rates).sort();

  return (
    <>
      <section><p className="text-sm text-muted-foreground">Reports</p><h1 className="text-2xl font-semibold tracking-tight">Financial Reports</h1></section>
      <QueryFilterForm className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-6">
        <select name="scope" defaultValue={scope} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All invoices</option><option value="paid">Paid only</option><option value="open">Open only</option></select>
        <select name="year" defaultValue={String(year)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
        <select name="currency" defaultValue={displayCurrency} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{currencyCodes.map((code) => <option key={code} value={code}>{code}</option>)}</select>
        <select name="sort" defaultValue={sort} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="month_asc">Month Jan-Dec</option><option value="month_desc">Month Dec-Jan</option><option value="value_desc">Highest month value</option><option value="value_asc">Lowest month value</option></select>
        <Button type="submit" variant="info">Apply</Button>
      </QueryFilterForm>
      <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-lg border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Revenue</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(revenue, displayCurrency)}</p></div><div className="rounded-lg border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Avg invoice value</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(averageInvoice, displayCurrency)}</p></div><div className="rounded-lg border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Total issued</p><p className="mt-2 text-2xl font-semibold">{filtered.length}</p></div></section>
      <section className="rounded-lg border bg-card p-5 shadow-sm"><h2 className="text-base font-semibold">Monthly totals</h2><div className="mt-5 flex h-64 items-end gap-3">{monthRows.map((month) => { const heightPercent = Math.max(8, Math.round((month.total / maxMonthTotal) * 100)); return <div key={month.label} className="flex flex-1 flex-col items-center gap-2"><div className="flex h-52 w-full items-end rounded-md bg-muted"><div className="w-full rounded-md bg-primary" style={{ height: `${heightPercent}%` }} /></div><span className="text-xs text-muted-foreground">{month.label}</span></div>; })}</div></section>
    </>
  );
}
