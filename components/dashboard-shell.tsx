"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteInvoiceAction } from "@/app/actions/invoices";
import { InvoiceStatusSelect } from "@/components/invoice-status-select";
import { Button } from "@/components/ui/button";
import type { DashboardData, DashboardInvoice } from "@/lib/invoices";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  sent: "bg-sky-50 text-sky-700 ring-sky-600/20",
  overdue: "bg-rose-50 text-rose-700 ring-rose-600/20",
  draft: "bg-zinc-100 text-zinc-700 ring-zinc-600/20",
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function DeleteInvoiceButton({ invoice }: { invoice: DashboardInvoice }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Delete invoice ${invoice.invoiceNo}?`)) return;
        startTransition(() => {
          void deleteInvoiceAction(invoice.id).then(() => router.refresh());
        });
      }}
    >
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  );
}

export function DashboardShell({ data }: { data: DashboardData }) {
  const stats = [
    { label: "Revenue", value: currencyFormatter.format(data.stats.revenue), change: "Paid" },
    {
      label: "Outstanding",
      value: currencyFormatter.format(data.stats.outstanding),
      change: "Open",
    },
    { label: "Paid invoices", value: String(data.stats.paidInvoices), change: "Paid" },
    { label: "Drafts", value: String(data.stats.drafts), change: "Draft" },
  ];

  return (
    <>
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Dashboard</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Invoice overview</h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button type="button" variant="outline">
            Export
          </Button>
          <Button asChild type="button" variant="success">
            <Link href="/invoices/new">
              <Plus className="size-4" />
              Create invoice
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
              <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{stat.change}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b p-5">
            <div>
              <h2 className="text-base font-semibold">Recent invoices</h2>
              <p className="mt-1 text-sm text-muted-foreground">Latest activity across your billing pipeline.</p>
            </div>
            <Button asChild type="button" variant="outline" className="hidden sm:inline-flex">
              <Link href="/invoices">View all</Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Change</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.invoices.length > 0 ? (
                  data.invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-muted/40">
                      <td className="px-5 py-4 font-medium">{invoice.invoiceNo}</td>
                      <td className="px-5 py-4 text-muted-foreground">{invoice.customer}</td>
                      <td className="px-5 py-4 text-muted-foreground">{invoice.date}</td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                            statusStyles[invoice.status] ?? statusStyles.draft
                          )}
                        >
                          {formatStatus(invoice.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <InvoiceStatusSelect invoiceId={invoice.id} status={invoice.status} />
                      </td>
                      <td className="px-5 py-4 text-right font-medium">{invoice.amount}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button asChild type="button" variant="info" size="sm">
                            <a href={`/api/invoices/${invoice.id}/export`} target="_blank" rel="noreferrer">
                              Export
                            </a>
                          </Button>
                          <Button asChild type="button" variant="warning" size="sm">
                            <Link href={`/invoices/${invoice.id}/edit`}>Edit</Link>
                          </Button>
                          <Button asChild type="button" variant="secondary" size="sm">
                            <Link href={`/invoices/new?duplicateFrom=${invoice.id}`}>Duplicate</Link>
                          </Button>
                          <DeleteInvoiceButton invoice={invoice} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-8 text-center text-muted-foreground" colSpan={7}>
                      No invoices yet. Create your first invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Cash flow</h2>
              <p className="mt-1 text-sm text-muted-foreground">Last 6 months</p>
            </div>
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">+9.8%</span>
          </div>
          <div className="mt-6 flex h-56 items-end gap-3">
            {[42, 58, 48, 72, 64, 88].map((height, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-44 w-full items-end rounded-md bg-muted">
                  <div className="w-full rounded-md bg-primary" style={{ height: `${height}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">{["Dec", "Jan", "Feb", "Mar", "Apr", "May"][index]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
