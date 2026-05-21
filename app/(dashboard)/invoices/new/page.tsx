import { InvoiceForm } from "@/components/invoice-form";
import { getCsrfToken } from "@/lib/auth/csrf";
import { requireSession } from "@/lib/auth/session";
import { getInvoice } from "@/lib/invoices";

function toDateInputValue(date: Date | null) {
  if (!date) return undefined;
  return date.toISOString().slice(0, 10);
}

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const csrfToken = await getCsrfToken();
  const params = await searchParams;
  const duplicateFrom = typeof params.duplicateFrom === "string" ? params.duplicateFrom : undefined;

  let initialData: Parameters<typeof InvoiceForm>[0]["initialData"] | undefined;

  if (duplicateFrom) {
    const source = await getInvoice(
      duplicateFrom,
      session.user.id,
      session.user.role === "ADMIN"
    );

    if (source) {
      initialData = {
        currency: source.currency,
        title: source.title ?? "INVOICE",
        companyName: source.companyName ?? "Your Company",
        companyEmail: source.companyEmail ?? "",
        companyPhone: source.companyPhone ?? "",
        companyAddress: source.companyAddress ?? "",
        companyLogoUrl: source.companyLogoUrl ?? "",
        customerName: source.customer.name,
        customerEmail: source.customer.email ?? "",
        customerPhone: source.customer.phone ?? "",
        status: "draft",
        dueDate: toDateInputValue(source.dueDate),
        notes: source.notes ?? "",
        taxRate: source.subtotal > 0 ? Number(((source.tax / source.subtotal) * 100).toFixed(2)) : 0,
        items: source.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.price,
        })),
      };
    }
  }

  return (
    <>
      <section><p className="text-sm text-muted-foreground">Invoices</p><h1 className="text-2xl font-semibold tracking-tight">Create Invoice</h1></section>
      <InvoiceForm csrfToken={csrfToken} initialData={initialData} />
    </>
  );
}
