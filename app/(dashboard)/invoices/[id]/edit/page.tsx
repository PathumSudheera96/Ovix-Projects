import { notFound } from "next/navigation";

import { InvoiceEditForm } from "@/components/invoice-edit-form";
import { getCsrfToken } from "@/lib/auth/csrf";
import { requireSession } from "@/lib/auth/session";
import { getInvoice } from "@/lib/invoices";

function toDateInputValue(date: Date | null | undefined) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const invoice = await getInvoice(id, session.user.id, session.user.role === "ADMIN");
  const csrfToken = await getCsrfToken();
  if (!invoice) notFound();
  const taxRate = invoice.subtotal > 0 ? (invoice.tax / invoice.subtotal) * 100 : 0;

  return (
    <>
      <section><p className="text-sm text-muted-foreground">Invoices</p><h1 className="text-2xl font-semibold tracking-tight">Edit Invoice {invoice.invoiceNo}</h1></section>
      <InvoiceEditForm
        csrfToken={csrfToken}
        invoice={{
          id: invoice.id,
          invoiceNo: invoice.invoiceNo,
          currency: invoice.currency,
          title: invoice.title ?? "INVOICE",
          companyName: invoice.companyName ?? "Your Company",
          companyEmail: invoice.companyEmail ?? "",
          companyPhone: invoice.companyPhone ?? "",
          companyAddress: invoice.companyAddress ?? "",
          companyLogoUrl: invoice.companyLogoUrl ?? "",
          dueDate: toDateInputValue(invoice.dueDate),
          customerName: invoice.customer.name,
          customerEmail: invoice.customer.email ?? "",
          customerPhone: invoice.customer.phone ?? "",
          status: invoice.status,
          notes: invoice.notes ?? "",
          taxRate,
          items: invoice.items.map((item) => ({ id: item.id, description: item.description, quantity: item.quantity, rate: item.price })),
        }}
      />
    </>
  );
}
