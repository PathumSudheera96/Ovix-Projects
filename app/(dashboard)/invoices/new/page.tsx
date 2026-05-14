import { InvoiceForm } from "@/components/invoice-form";
import { getCsrfToken } from "@/lib/auth/csrf";
import { requireSession } from "@/lib/auth/session";

export default async function NewInvoicePage() {
  await requireSession();
  const csrfToken = await getCsrfToken();
  return (
    <>
      <section><p className="text-sm text-muted-foreground">Invoices</p><h1 className="text-2xl font-semibold tracking-tight">Create Invoice</h1></section>
      <InvoiceForm csrfToken={csrfToken} />
    </>
  );
}
