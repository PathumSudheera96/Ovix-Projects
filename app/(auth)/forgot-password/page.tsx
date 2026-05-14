import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getCsrfToken } from "@/lib/auth/csrf";

export default async function ForgotPasswordPage() {
  const csrfToken = await getCsrfToken();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="text-sm text-muted-foreground">
        Enter your email and we will send password reset instructions.
      </p>
      <ForgotPasswordForm csrfToken={csrfToken} />
    </div>
  );
}
