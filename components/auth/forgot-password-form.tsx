"use client";

import Link from "next/link";
import { useActionState } from "react";

import { forgotPasswordAction } from "@/app/(auth)/actions";
import { defaultAuthFormState } from "@/lib/auth/form-state";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm({ csrfToken }: { csrfToken: string }) {
  const [state, formAction] = useActionState(forgotPasswordAction, defaultAuthFormState);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Account email
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-destructive"}`}>
          {state.message}
        </p>
      ) : null}
      <SubmitButton label="Send Reset Link" pendingLabel="Sending..." />
      <Link href="/login" className="block text-sm text-primary hover:underline">
        Back to login
      </Link>
    </form>
  );
}
