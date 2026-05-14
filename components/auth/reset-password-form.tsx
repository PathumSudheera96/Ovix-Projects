"use client";

import Link from "next/link";
import { useActionState } from "react";

import { resetPasswordAction } from "@/app/(auth)/actions";
import { defaultAuthFormState } from "@/lib/auth/form-state";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm({
  csrfToken,
  token,
}: {
  csrfToken: string;
  token: string;
}) {
  const [state, formAction] = useActionState(
    resetPasswordAction.bind(null, token),
    defaultAuthFormState
  );

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        <Input id="password" name="password" type="password" minLength={12} required />
      </div>
      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm new password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          minLength={12}
          required
        />
      </div>
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-destructive"}`}>
          {state.message}
        </p>
      ) : null}
      <SubmitButton label="Reset Password" pendingLabel="Updating..." />
      <Link href="/login" className="block text-sm text-primary hover:underline">
        Back to login
      </Link>
    </form>
  );
}
