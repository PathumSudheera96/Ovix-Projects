"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChartNoAxesColumnIncreasing,
  FileText,
  Home,
  Menu,
  Plus,
  Search,
  Settings,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useState, useTransition } from "react";

import { deleteInvoiceAction } from "@/app/actions/invoices";
import { InvoiceForm } from "@/components/invoice-form";
import { Button } from "@/components/ui/button";
import type { DashboardData, DashboardInvoice } from "@/lib/invoices";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Overview", href: "/", icon: Home },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Payments", href: "/payments", icon: WalletCards },
  { name: "Reports", href: "/reports", icon: ChartNoAxesColumnIncreasing },
  { name: "Settings", href: "/settings", icon: Settings },
];

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

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <FileText className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">InvoiceFlow</p>
          <p className="mt-1 text-xs text-muted-foreground">Billing workspace</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Starter plan</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            72 of 100 invoices used this month.
          </p>
          <div className="mt-3 h-2 rounded-full bg-muted">
            <div className="h-2 w-[72%] rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteInvoiceButton({ invoice }: { invoice: DashboardInvoice }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Delete invoice ${invoice.invoiceNo}?`)) {
          return;
        }

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const stats = [
    {
      label: "Revenue",
      value: currencyFormatter.format(data.stats.revenue),
      change: "Paid",
    },
    {
      label: "Outstanding",
      value: currencyFormatter.format(data.stats.outstanding),
      change: "Open",
    },
    {
      label: "Paid invoices",
      value: String(data.stats.paidInvoices),
      change: "Paid",
    },
    {
      label: "Drafts",
      value: String(data.stats.drafts),
      change: "Draft",
    },
  ];

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:block">
        <Sidebar />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-72 max-w-[82vw] shadow-xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            <div className="relative hidden min-w-0 flex-1 md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-10 w-full max-w-md rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20"
                placeholder="Search invoices, customers, or payments"
                type="search"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" aria-label="Notifications">
                <Bell className="size-4" />
              </Button>
              <Button type="button" className="hidden sm:inline-flex">
                <Plus className="size-4" />
                New invoice
              </Button>
              <Button type="button" size="icon" className="sm:hidden" aria-label="New invoice">
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">
            <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Dashboard</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Invoice overview
                </h1>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button type="button" variant="outline">Export</Button>
                <Button type="button">
                  <Plus className="size-4" />
                  Create invoice
                </Button>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-lg border bg-card p-5 shadow-sm">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                      {stat.change}
                    </span>
                  </div>
                </div>
              ))}
            </section>

            <InvoiceForm />

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-lg border bg-card shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b p-5">
                  <div>
                    <h2 className="text-base font-semibold">Recent invoices</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Latest activity across your billing pipeline.
                    </p>
                  </div>
                  <Button type="button" variant="outline" className="hidden sm:inline-flex">
                    View all
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
                            <td className="px-5 py-4 text-right font-medium">{invoice.amount}</td>
                            <td className="px-5 py-4 text-right">
                              <DeleteInvoiceButton invoice={invoice} />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-5 py-8 text-center text-muted-foreground" colSpan={6}>
                            No invoices yet. Create your first invoice above.
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
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    +9.8%
                  </span>
                </div>
                <div className="mt-6 flex h-56 items-end gap-3">
                  {[42, 58, 48, 72, 64, 88].map((height, index) => (
                    <div key={index} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-44 w-full items-end rounded-md bg-muted">
                        <div
                          className="w-full rounded-md bg-primary"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {["Dec", "Jan", "Feb", "Mar", "Apr", "May"][index]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
