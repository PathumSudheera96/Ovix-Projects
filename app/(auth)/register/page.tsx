import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/register-form";
import { getCsrfToken } from "@/lib/auth/csrf";

export default async function RegisterPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  const csrfToken = await getCsrfToken();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <RegisterForm csrfToken={csrfToken} />
    </div>
  );
}
