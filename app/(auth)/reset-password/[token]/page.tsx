import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getCsrfToken } from "@/lib/auth/csrf";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const csrfToken = await getCsrfToken();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <ResetPasswordForm token={token} csrfToken={csrfToken} />
    </div>
  );
}
