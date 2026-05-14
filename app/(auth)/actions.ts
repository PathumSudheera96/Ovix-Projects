"use server";

import AuthError from "next-auth";
import { headers } from "next/headers";
import { randomBytes, createHash } from "node:crypto";

import { signIn, signOut } from "@/auth";
import { assertValidCsrf } from "@/lib/auth/csrf";
import type { AuthFormState } from "@/lib/auth/form-state";
import { hashPassword } from "@/lib/auth/password";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/auth/validation";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readIp(headersStore: Headers) {
  return headersStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

async function validateCsrf(formData: FormData): Promise<AuthFormState | null> {
  try {
    await assertValidCsrf(formData);
    return null;
  } catch {
    return { ok: false, message: "Security token expired. Refresh and try again." };
  }
}

export async function loginAction(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  try {
    const csrfError = await validateCsrf(formData);
    if (csrfError) {
      return csrfError;
    }

    const credentials = {
      email: readString(formData, "email"),
      password: readString(formData, "password"),
    };

    const parsed = loginSchema.safeParse(credentials);
    if (!parsed.success) {
      return { ok: false, message: "Invalid email or password format." };
    }

    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: readString(formData, "callbackUrl") || "/",
    });
    return { ok: true, message: "Signed in." };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: "Invalid email or password." };
    }
    return { ok: false, message: "Sign in failed. Please try again." };
  }
}

export async function registerAction(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  try {
    const csrfError = await validateCsrf(formData);
    if (csrfError) {
      return csrfError;
    }

    const parsed = registerSchema.safeParse({
      name: readString(formData, "name"),
      email: readString(formData, "email").toLowerCase(),
      password: readString(formData, "password"),
      confirmPassword: readString(formData, "confirmPassword"),
    });

    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });

    if (existing) {
      return { ok: false, message: "Account already exists for this email." };
    }

    const passwordHash = await hashPassword(parsed.data.password);

    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: "USER",
      },
    });

    return { ok: true, message: "Account created. You can log in now." };
  } catch {
    return { ok: false, message: "Registration failed. Please try again." };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function forgotPasswordAction(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  try {
    const csrfError = await validateCsrf(formData);
    if (csrfError) {
      return csrfError;
    }
    const ip = readIp(await headers());
    const limit = consumeRateLimit(`forgot:${ip}`, 6, 10 * 60 * 1000);

    if (!limit.ok) {
      return { ok: false, message: "Too many requests. Try again later." };
    }

    const parsed = forgotPasswordSchema.safeParse({
      email: readString(formData, "email").toLowerCase(),
    });

    if (!parsed.success) {
      return { ok: true, message: "If an account exists, reset instructions were sent." };
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, email: true },
    });

    if (user) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      const resetUrl = `${env.APP_URL}/reset-password/${rawToken}`;

      // In production, send this using your SMTP provider.
      console.info(`[PASSWORD RESET LINK] ${user.email}: ${resetUrl}`);
    }

    return { ok: true, message: "If an account exists, reset instructions were sent." };
  } catch {
    return { ok: false, message: "Request failed. Please try again." };
  }
}

export async function resetPasswordAction(
  token: string,
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  try {
    const csrfError = await validateCsrf(formData);
    if (csrfError) {
      return csrfError;
    }

    const parsed = resetPasswordSchema.safeParse({
      token,
      password: readString(formData, "password"),
      confirmPassword: readString(formData, "confirmPassword"),
    });

    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const tokenHash = hashToken(parsed.data.token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return { ok: false, message: "Reset link is invalid or expired." };
    }

    const passwordHash = await hashPassword(parsed.data.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { ok: true, message: "Password updated. You can sign in now." };
  } catch {
    return { ok: false, message: "Password reset failed. Please try again." };
  }
}
