import { prisma } from "@/lib/prisma";
import { buildInvoicePdfFromHtml, resolveLogoUrl } from "@/lib/pdf/invoice-html-pdf";
import { buildInvoicePdf } from "@/lib/pdf/invoice-pdf";

type BuildInvoicePdfArgs = {
  invoiceId: string;
  userId: string;
  isAdmin: boolean;
  baseUrl: string;
};

export async function buildInvoicePdfBytesForUser({
  invoiceId,
  userId,
  isAdmin,
  baseUrl,
}: BuildInvoicePdfArgs) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, ...(isAdmin ? {} : { userId }) },
    include: {
      customer: true,
      items: { orderBy: { id: "asc" } },
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const pdfInput = {
    currency: invoice.currency,
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

  return {
    bytes,
    renderer,
    invoice,
  };
}
