export default function Loading() {
  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
          <div className="size-9 animate-pulse rounded-md bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="h-3 w-52 animate-pulse rounded bg-muted" />
          </div>
          <div className="ml-auto size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-lg border bg-card p-5">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-4 h-7 w-28 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>

        <div className="rounded-lg border bg-card p-5">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
