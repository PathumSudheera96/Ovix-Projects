import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { buildInvoicePdfBytesForUser } from "@/lib/pdf/invoice-export";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const isAdmin = session.user.role === "ADMIN";
  const baseUrl = new URL(request.url).origin;
  const { bytes, renderer, invoice } = await buildInvoicePdfBytesForUser({
    invoiceId: id,
    userId: session.user.id,
    isAdmin,
    baseUrl,
  }).catch(() => ({
    bytes: null,
    renderer: "none",
    invoice: null,
  }));

  if (!bytes || !invoice) {
    return NextResponse.json({ ok: false, message: "Invoice not found" }, { status: 404 });
  }

  const pdfBuffer = Buffer.from(bytes);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNo}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Invoice-Pdf-Renderer": renderer,
    },
  });
}
