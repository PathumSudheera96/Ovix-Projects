import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md space-y-3 rounded-lg border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          You do not have permission to access this page.
        </p>
        <Link href="/" className="text-sm text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
