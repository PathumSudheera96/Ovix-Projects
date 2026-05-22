import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const customers = await prisma.customer.findMany({
    where: isAdmin ? undefined : { invoices: { some: { userId: session.user.id } } },
    select: {
      name: true,
      email: true,
      phone: true,
    },
    orderBy: { name: "asc" },
    take: 200,
  });

  return NextResponse.json({
    ok: true,
    customers,
  });
}

