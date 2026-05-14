"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import {
  Bell,
  ChartNoAxesColumnIncreasing,
  FileText,
  Home,
  Menu,
  Settings,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Overview", href: "/", icon: Home },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Payments", href: "/payments", icon: WalletCards },
  { name: "Reports", href: "/reports", icon: ChartNoAxesColumnIncreasing },
  { name: "Settings", href: "/settings", icon: Settings },
];

function Sidebar({
  onNavigate,
}: {
  onNavigate?: (href: string) => void;
}) {
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
              onClick={() => onNavigate?.(item.href)}
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
    </div>
  );
}

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isNavPending, startTransition] = useTransition();

  function handleMainNavigate(href: string) {
    if (href === pathname) return;
    setMobileOpen(false);
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:block">
        <Sidebar onNavigate={handleMainNavigate} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-72 max-w-[82vw] shadow-xl">
            <Sidebar onNavigate={handleMainNavigate} />
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
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">InvoiceFlow</p>
              <p className="truncate text-sm text-muted-foreground">Billing workspace</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" aria-label="Notifications">
                <Bell className="size-4" />
              </Button>
              <form action={logoutAction}>
                <Button type="submit" variant="outline">
                  Logout
                </Button>
              </form>
            </div>
          </div>
        </header>

        <main className="relative px-4 py-6 sm:px-6 lg:px-8">
          {isNavPending ? (
            <div className="absolute inset-0 z-30 bg-background/70 backdrop-blur-sm">
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-3 rounded-md border bg-card px-4 py-2 text-sm shadow-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Loading...
                </div>
              </div>
            </div>
          ) : null}
          <div className="mx-auto flex max-w-7xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
