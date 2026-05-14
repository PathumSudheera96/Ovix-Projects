import { QueryFilterForm } from "@/components/query-filter-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireSession } from "@/lib/auth/session";

type Section = { key: "profile" | "billing" | "security"; title: string; keywords: string; order: number };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const session = await requireSession();
  const q = String(params.q ?? "").trim().toLowerCase();
  const section = String(params.section ?? "all");
  const sort = String(params.sort ?? "default");
  let sections: Section[] = [
    { key: "profile", title: "Profile", keywords: "name email account user", order: 1 },
    { key: "billing", title: "Billing Preferences", keywords: "currency tax invoice billing", order: 2 },
    { key: "security", title: "Security", keywords: "password session login auth", order: 3 },
  ];
  sections = sections.filter((s) => (section === "all" || s.key === section) && (!q || `${s.title} ${s.keywords}`.toLowerCase().includes(q)));
  if (sort === "az") sections.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "za") sections.sort((a, b) => b.title.localeCompare(a.title));
  if (sort === "default") sections.sort((a, b) => a.order - b.order);
  const showProfile = sections.some((s) => s.key === "profile");
  const showBilling = sections.some((s) => s.key === "billing");
  const showSecurity = sections.some((s) => s.key === "security");

  return (
    <>
      <section><p className="text-sm text-muted-foreground">Settings</p><h1 className="text-2xl font-semibold tracking-tight">Workspace Settings</h1></section>
      <QueryFilterForm className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
        <input name="q" defaultValue={q} placeholder="Quick find setting..." className="h-10 rounded-md border border-input bg-background px-3 text-sm xl:col-span-2" />
        <select name="section" defaultValue={section} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All sections</option><option value="profile">Profile</option><option value="billing">Billing</option><option value="security">Security</option></select>
        <select name="sort" defaultValue={sort} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="default">Default order</option><option value="az">Title A-Z</option><option value="za">Title Z-A</option></select>
        <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Apply</button>
      </QueryFilterForm>
      <section className="grid gap-6 xl:grid-cols-2">
        {showProfile ? <form className="space-y-4 rounded-lg border bg-card p-5 shadow-sm"><h2 className="text-base font-semibold">Profile</h2><div className="space-y-2"><label htmlFor="name" className="text-sm font-medium">Full name</label><Input id="name" defaultValue={session.user.name ?? ""} /></div><div className="space-y-2"><label htmlFor="email" className="text-sm font-medium">Email</label><Input id="email" type="email" defaultValue={session.user.email ?? ""} /></div><Button type="button">Save profile</Button></form> : null}
        {showBilling ? <form className="space-y-4 rounded-lg border bg-card p-5 shadow-sm"><h2 className="text-base font-semibold">Billing Preferences</h2><div className="space-y-2"><label htmlFor="currency" className="text-sm font-medium">Default currency</label><Input id="currency" defaultValue="USD" /></div><div className="space-y-2"><label htmlFor="tax" className="text-sm font-medium">Default tax rate (%)</label><Input id="tax" type="number" defaultValue="8" /></div><Button type="button">Save billing settings</Button></form> : null}
      </section>
      {showSecurity ? <section className="rounded-lg border bg-card p-5 shadow-sm"><h2 className="text-base font-semibold">Security</h2><p className="mt-1 text-sm text-muted-foreground">Password and session controls for your account.</p><div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="outline">Change password</Button><Button type="button" variant="outline">Manage active sessions</Button></div></section> : null}
    </>
  );
}
