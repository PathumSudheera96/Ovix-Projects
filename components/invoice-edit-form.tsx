"use client";

import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import {
  updateInvoiceAction,
  type InvoiceActionState,
} from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
};

const currencyOptions =
  typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("currency")
    : ["USD", "EUR", "GBP", "JPY", "AUD", "CAD"];

type EditInvoiceData = {
  id: string;
  invoiceNo: string;
  title: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyLogoUrl: string;
  dueDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: string;
  notes: string;
  taxRate: number;
  items: InvoiceItem[];
};
const MAX_LOGO_SIZE_BYTES = 4 * 1024 * 1024;

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(Number.isFinite(value) ? value : 0);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number.isFinite(value) ? value : 0);
  }
}

function normalizeNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

const initialActionState: InvoiceActionState = {
  ok: false,
  message: "",
};

export function InvoiceEditForm({
  csrfToken,
  invoice,
}: {
  csrfToken: string;
  invoice: EditInvoiceData;
}) {
  const [actionState, formAction, isPending] = useActionState(
    updateInvoiceAction.bind(null, invoice.id),
    initialActionState
  );
  const [items, setItems] = useState<InvoiceItem[]>(invoice.items);
  const [taxRate, setTaxRate] = useState(invoice.taxRate);
  const [currency, setCurrency] = useState("USD");
  const [logoUrl, setLogoUrl] = useState(invoice.companyLogoUrl);
  const [companyName, setCompanyName] = useState(invoice.companyName);
  const [invoiceTitle, setInvoiceTitle] = useState(invoice.title);
  const [companyEmail, setCompanyEmail] = useState(invoice.companyEmail);
  const [companyPhone, setCompanyPhone] = useState(invoice.companyPhone);
  const [companyAddress, setCompanyAddress] = useState(invoice.companyAddress);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [logoUploadMessage, setLogoUploadMessage] = useState("");

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const tax = subtotal * (taxRate / 100);
    return { subtotal, tax, total: subtotal + tax };
  }, [items, taxRate]);

  function updateItem(id: string, field: keyof InvoiceItem, value: string | number) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0 },
    ]);
  }

  function removeItem(id: string) {
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));
  }

  async function onLogoFileChange(file: File | undefined) {
    if (!file) return;
    setLogoUploadMessage("");
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setLogoUploadMessage("Logo must be 4MB or less.");
      return;
    }

    const payload = new FormData();
    payload.append("file", file);

    setLogoUploading(true);
    try {
      const response = await fetch("/api/uploads/logo", {
        method: "POST",
        body: payload,
      });
      const result = (await response.json()) as { ok: boolean; url?: string; message?: string };
      if (!response.ok || !result.ok || !result.url) {
        throw new Error(result.message ?? "Upload failed.");
      }
      setLogoLoadFailed(false);
      setLogoUrl(`${result.url}?v=${Date.now()}`);
      setLogoUploadMessage("Logo uploaded.");
    } catch {
      setLogoUploadMessage("Logo upload failed. Please try again.");
    } finally {
      setLogoUploading(false);
    }
  }

  return (
    <form action={formAction} className="rounded-lg border bg-card shadow-sm">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="companyLogoUrl" value={logoUrl} />
      <div className="border-b p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-start">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="company-logo-file">Logo</label>
                <label
                  htmlFor="company-logo-file"
                  className="relative flex size-[96px] cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-muted hover:bg-muted/80"
                >
                  {logoUrl && !logoLoadFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={logoUrl}
                      src={logoUrl}
                      alt="Company logo"
                      className="size-full object-cover"
                      onError={() => setLogoLoadFailed(true)}
                    />
                  ) : logoUploading ? (
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  ) : (
                    <ImagePlus className="size-5 text-muted-foreground" />
                  )}
                </label>
                <Input
                  id="company-logo-file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(event) => void onLogoFileChange(event.target.files?.[0])}
                />
                {logoUploadMessage ? (
                  <p className="text-xs text-muted-foreground">{logoUploadMessage}</p>
                ) : null}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="text-sm font-medium" htmlFor="company-name">Company</label>
                <Input
                  className="md:col-span-2"
                  id="company-name"
                  name="companyName"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                />
                <Input
                  id="company-email"
                  name="companyEmail"
                  type="email"
                  placeholder="Company email (required)"
                  value={companyEmail}
                  onChange={(event) => setCompanyEmail(event.target.value)}
                  required
                />
                <Input
                  id="company-phone"
                  name="companyPhone"
                  placeholder="Company phone (optional)"
                  value={companyPhone}
                  onChange={(event) => setCompanyPhone(event.target.value)}
                />
                <Input
                  className="md:col-span-2"
                  id="company-address"
                  name="companyAddress"
                  placeholder="Company address (optional)"
                  value={companyAddress}
                  onChange={(event) => setCompanyAddress(event.target.value)}
                />
              </div>
            </div>
            <h2 className="text-base font-semibold">Edit invoice</h2>
          </div>
          <div className="w-full max-w-xs space-y-2">
            <label className="text-sm font-medium" htmlFor="invoice-currency">
              Currency
            </label>
            <select
              id="invoice-currency"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              {currencyOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="invoice-number">Invoice no.</label>
              <Input id="invoice-number" name="invoiceNo" defaultValue={invoice.invoiceNo} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="invoice-title">Title</label>
              <Input
                id="invoice-title"
                name="title"
                value={invoiceTitle}
                onChange={(event) => setInvoiceTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="invoice-date">Due date</label>
              <Input id="invoice-date" name="dueDate" type="date" defaultValue={invoice.dueDate} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="customer-name">Customer</label>
              <Input id="customer-name" name="customerName" defaultValue={invoice.customerName} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="customer-email">Email</label>
              <Input id="customer-email" name="customerEmail" type="email" defaultValue={invoice.customerEmail} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="customer-phone">Phone</label>
              <Input id="customer-phone" name="customerPhone" defaultValue={invoice.customerPhone} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="invoice-status">Status</label>
              <select
                id="invoice-status"
                name="status"
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={invoice.status}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Invoice items</h3>
              <Button type="button" variant="secondary" size="sm" onClick={addItem}>
                <Plus className="size-4" />
                Add item
              </Button>
            </div>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[minmax(220px,1fr)_96px_120px_120px_40px] md:items-center"
                >
                  <Input
                    name={`items.${index}.description`}
                    value={item.description}
                    placeholder="Item description"
                    required
                    onChange={(event) => updateItem(item.id, "description", event.target.value)}
                  />
                  <Input
                    name={`items.${index}.quantity`}
                    type="number"
                    min="0"
                    step="1"
                    value={item.quantity}
                    onChange={(event) => updateItem(item.id, "quantity", normalizeNumber(event.target.value))}
                  />
                  <Input
                    name={`items.${index}.rate`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={(event) => updateItem(item.id, "rate", normalizeNumber(event.target.value))}
                  />
                  <div className="text-sm font-semibold md:text-right">
                    {formatCurrency(item.quantity * item.rate, currency)}
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    size="icon"
                    aria-label={`Remove item ${index + 1}`}
                    disabled={items.length === 1}
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="invoice-notes">Notes</label>
            <Textarea id="invoice-notes" name="notes" defaultValue={invoice.notes} />
          </div>
        </div>
        <aside className="h-fit rounded-lg border bg-background p-5">
          <h3 className="text-sm font-semibold">Summary</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(totals.subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-muted-foreground" htmlFor="tax-rate">Tax rate</label>
              <Input
                id="tax-rate"
                className="h-8 w-28 text-right"
                name="taxRate"
                type="number"
                min="0"
                step="0.01"
                value={taxRate}
                onChange={(event) => setTaxRate(normalizeNumber(event.target.value))}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-medium">{formatCurrency(totals.tax, currency)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-semibold">{formatCurrency(totals.total, currency)}</span>
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            <Button type="submit" variant="success" disabled={isPending} className="w-full">
              {isPending ? "Saving..." : "Save changes"}
            </Button>
            <Button type="button" variant="info" onClick={() => setPreviewOpen(true)}>
              Preview invoice
            </Button>
          </div>
          {actionState.message ? (
            <p
              className={cn(
                "mt-4 rounded-md px-3 py-2 text-xs",
                actionState.ok ? "bg-emerald-50 text-emerald-700" : "bg-destructive/10 text-destructive"
              )}
            >
              {actionState.message}
            </p>
          ) : null}
        </aside>
      </div>
      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl">
            <Button
              type="button"
              size="icon"
              className="absolute -top-12 right-0 rounded-full shadow-md"
              onClick={() => setPreviewOpen(false)}
              aria-label="Close preview"
            >
              <X className="size-4" />
            </Button>
            <div className="max-h-[90vh] overflow-auto rounded-lg border bg-card p-6 shadow-xl">
            <div className="mb-8 grid gap-6 md:grid-cols-[1fr_auto]">
              <div className="flex items-start gap-3">
                <div className="flex size-14 items-center justify-center overflow-hidden rounded-md border bg-muted">
                  {logoUrl && !logoLoadFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`preview-${logoUrl}`}
                      src={logoUrl}
                      alt="Company logo"
                      className="size-full object-cover"
                      onError={() => setLogoLoadFailed(true)}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Logo</span>
                  )}
                </div>
                <div>
                  <p className="text-lg font-semibold">{companyName || "Your Company"}</p>
                  <p className="text-sm text-muted-foreground">{invoice.invoiceNo}</p>
                  <p className="text-sm text-muted-foreground">{companyEmail}</p>
                  {companyPhone ? <p className="text-sm text-muted-foreground">{companyPhone}</p> : null}
                  {companyAddress ? <p className="text-sm text-muted-foreground">{companyAddress}</p> : null}
                </div>
              </div>
              <div className="text-left md:text-right">
                <p className="text-5xl font-light tracking-wide text-foreground/80">
                  {invoiceTitle || "INVOICE"}
                </p>
                <p className="mt-2 text-2xl font-medium text-muted-foreground"># {invoice.invoiceNo}</p>
                <p className="mt-6 text-sm text-muted-foreground">
                  Date:{" "}
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date())}
                </p>
                <div className="mt-3 rounded-md bg-muted px-4 py-3">
                  <p className="text-lg font-semibold">
                    Balance Due: {formatCurrency(totals.total, currency)}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b pb-2 text-sm">
                  <span>{item.description || "Untitled item"}</span>
                  <span>
                    {item.quantity} x {formatCurrency(item.rate, currency)} ={" "}
                    {formatCurrency(item.quantity * item.rate, currency)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6 ml-auto w-full max-w-xs space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(totals.subtotal, currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(totals.tax, currency)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2 font-semibold">
                <span>Total</span>
                <span>{formatCurrency(totals.total, currency)}</span>
              </div>
            </div>
          </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
