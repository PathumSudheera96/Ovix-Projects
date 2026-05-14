export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-md border bg-card px-4 py-2 text-sm shadow-sm">
        <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading...
      </div>
    </div>
  );
}
