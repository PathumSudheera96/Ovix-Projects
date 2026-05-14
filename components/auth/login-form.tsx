"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({
  callbackUrl,
}: {
  callbackUrl: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<{ ok: boolean; message: string }>({
    ok: false,
    message: "",
  });
  const [isPending, setIsPending] = useState(false);

  function getSafeCallbackUrl(raw: string) {
    const decoded = decodeURIComponent(raw || "/");
    if (!decoded.startsWith("/") || decoded.startsWith("//")) {
      return "/";
    }

    return decoded;
  }

  async function waitForSession(maxAttempts = 12, delayMs = 200) {
    for (let i = 0; i < maxAttempts; i += 1) {
      const sessionResponse = await fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store",
      });
      const session = (await sessionResponse.json()) as { user?: { email?: string } };

      if (session?.user?.email) {
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return false;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setIsPending(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setIsPending(false);

    if (result?.error) {
      setState({ ok: false, message: "Invalid email or password." });
      return;
    }

    const target = getSafeCallbackUrl(callbackUrl);
    const hasSession = await waitForSession();

    if (!hasSession) {
      setState({
        ok: false,
        message: "Login succeeded but session was not established. Please try again.",
      });
      return;
    }

    setState({ ok: true, message: "Signed in. Redirecting..." });
    router.replace(target);
    router.refresh();
    window.location.assign(target);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
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
          autoComplete="current-password"
          required
        />
      </div>
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-destructive"}`}>
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Signing In..." : "Sign In"}
      </Button>
      <div className="flex items-center justify-between text-sm">
        <Link href="/register" className="text-primary hover:underline">
          Create account
        </Link>
        <Link href="/forgot-password" className="text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
