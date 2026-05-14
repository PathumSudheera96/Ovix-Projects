import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/auth/validation";
import { csrfFieldName } from "@/lib/auth/csrf";
import { prisma } from "@/lib/prisma";

function safeCompare(a: string, b: string) {
  return a.length === b.length && a === b;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const payload =
      contentType.includes("application/json")
        ? await request.json()
        : Object.fromEntries(await request.formData());

    const csrfHeader = request.headers.get("x-csrf-token") ?? "";
    const csrfBody = String(payload[csrfFieldName] ?? "");

    if (!csrfHeader || !csrfBody || !safeCompare(csrfHeader, csrfBody)) {
      return NextResponse.json(
        { ok: false, message: "Security token expired. Refresh and try again." },
        { status: 400 }
      );
    }

    const parsed = registerSchema.safeParse({
      name: String(payload.name ?? "").trim(),
      email: String(payload.email ?? "").trim().toLowerCase(),
      password: String(payload.password ?? ""),
      confirmPassword: String(payload.confirmPassword ?? ""),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, message: "Account already exists for this email." },
        { status: 409 }
      );
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

    return NextResponse.json({ ok: true, message: "Account created. You can log in now." });
  } catch (error) {
    console.error("REGISTER_ROUTE_ERROR", error);
    return NextResponse.json(
      { ok: false, message: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
