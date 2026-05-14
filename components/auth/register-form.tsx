"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm({ csrfToken }: { csrfToken: string }) {
  const [state, setState] = useState<{ ok: boolean; message: string }>({
    ok: false,
    message: "",
  });
  const [isPending, setIsPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      setIsPending(true);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "x-csrf-token": csrfToken,
        },
        body: formData,
      });
      const result = (await response.json()) as { ok: boolean; message: string };
      setState(result);
      if (result.ok) {
        form.reset();
      }
    } catch {
      setState({ ok: false, message: "Registration failed. Please try again." });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <Input id="name" name="name" autoComplete="name" required />
      </div>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </div>
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-destructive"}`}>
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creating..." : "Create Account"}
      </Button>
      <Link href="/login" className="block text-sm text-primary hover:underline">
        Back to login
      </Link>
    </form>
  );
}
