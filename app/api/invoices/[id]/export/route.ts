import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { buildInvoicePdfFromHtml, resolveLogoUrl } from "@/lib/pdf/invoice-html-pdf";
import { prisma } from "@/lib/prisma";
import { buildInvoicePdf } from "@/lib/pdf/invoice-pdf";

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
  const invoice = await prisma.invoice.findFirst({
    where: { id, ...(isAdmin ? {} : { userId: session.user.id }) },
    include: {
      customer: true,
      items: { orderBy: { id: "asc" } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ ok: false, message: "Invoice not found" }, { status: 404 });
  }

  const baseUrl = new URL(request.url).origin;
  const pdfInput = {
    title: invoice.title,
    companyName: invoice.companyName,
    companyEmail: invoice.companyEmail,
    companyPhone: invoice.companyPhone,
    companyAddress: invoice.companyAddress,
    companyLogoUrl: resolveLogoUrl(invoice.companyLogoUrl, baseUrl),
    invoiceNo: invoice.invoiceNo,
    createdAt: invoice.createdAt,
    dueDate: invoice.dueDate,
    status: invoice.status,
    customer: {
      name: invoice.customer.name,
      email: invoice.customer.email,
      phone: invoice.customer.phone,
    },
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
    })),
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    total: invoice.total,
    notes: invoice.notes,
  };

  let renderer = "html";
  const bytes = await buildInvoicePdfFromHtml(pdfInput).catch(async (error) => {
    renderer = "pdf-lib-fallback";
    console.error("PDF_HTML_RENDER_FAILED", error);
    return buildInvoicePdf(pdfInput);
  });

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
