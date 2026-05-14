import { DashboardShell } from "@/components/dashboard-shell";
import { requireSession } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/invoices";

export default async function HomePage() {
  const session = await requireSession();
  const data = await getDashboardData(session.user.id, session.user.role === "ADMIN");
  return <DashboardShell data={data} />;
}
