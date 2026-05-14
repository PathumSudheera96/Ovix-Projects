import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return <AppShell>{children}</AppShell>;
}
