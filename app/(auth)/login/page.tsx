import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; email?: string; password?: string }>;
}) {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  const params = await searchParams;
  const decodedCallback = params.callbackUrl
    ? decodeURIComponent(params.callbackUrl)
    : "/";
  const safeCallback =
    decodedCallback.startsWith("/") && !decodedCallback.startsWith("//")
      ? decodedCallback
      : "/";

  // Never allow password in URL query params. Strip it immediately.
  if (params.password) {
    const sanitized = new URLSearchParams();
    sanitized.set("callbackUrl", safeCallback);
    if (params.email) {
      sanitized.set("email", params.email);
    }
    redirect(`/login?${sanitized.toString()}`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in to InvoiceFlow</h1>
      <LoginForm callbackUrl={safeCallback} />
    </div>
  );
}
