import { redirect } from "next/navigation";

import { auth } from "@/auth";

export async function requireSession() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(role: "ADMIN" | "USER") {
  const session = await requireSession();

  if (role === "ADMIN" && session.user.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  return session;
}
