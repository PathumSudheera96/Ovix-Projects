import { requireRole } from "@/lib/auth/session";

export default async function AdminPage() {
  const session = await requireRole("ADMIN");

  return (
    <main className="p-6">
      <div className="mx-auto max-w-3xl rounded-lg border bg-card p-6">
        <h1 className="text-2xl font-semibold">Admin Console</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as {session.user.email}. This route is protected with role-based
          authorization in middleware and server checks.
        </p>
      </div>
    </main>
  );
}
