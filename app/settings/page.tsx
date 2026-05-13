import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardData } from "@/lib/invoices";

export default async function SettingsPage() {
  const data = await getDashboardData();

  return <DashboardShell data={data} />;
}
