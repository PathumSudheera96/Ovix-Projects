"use client";

import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createInvoiceAction,
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

type SavedCustomer = {
  name: string;
  email: string | null;
  phone: string | null;
};

export type InvoiceFormInitialData = {
  invoiceNo?: string;
  currency?: string;
  title?: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyLogoUrl?: string;
  dueDate?: string;
  status?: "draft" | "sent" | "paid" | "overdue";
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  taxRate?: number;
  discountType?: "none" | "percent" | "fixed";
  discountValue?: number;
  items?: Array<{
    description: string;
    quantity: number;
    rate: number;
  }>;
};

const defaultItems: InvoiceItem[] = [
  {
    id: "brand-identity-design",
    description: "Brand identity design",
    quantity: 1,
    rate: 1200,
  },
  {
    id: "monthly-retainer",
    description: "Monthly retainer",
    quantity: 2,
    rate: 450,
  },
];
const MAX_LOGO_SIZE_BYTES = 4 * 1024 * 1024;

function createItem(): InvoiceItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    rate: 0,
  };
}

const currencyOptions =
  typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("currency")
    : ["USD", "EUR", "GBP", "JPY", "AUD", "CAD"];

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

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

const initialActionState: InvoiceActionState = {
  ok: false,
  message: "",
};

function createDefaultInvoiceNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const t = String(now.getTime()).slice(-4);

  return `INV-${y}${m}${d}-${t}`;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeInitialItems(initialData?: InvoiceFormInitialData): InvoiceItem[] {
  if (!initialData?.items?.length) {
    return defaultItems;
  }

  return initialData.items.map((item, index) => ({
    id: `initial-${index}-${item.description || "item"}`.toLowerCase().replace(/\s+/g, "-"),
    description: item.description,
    quantity: Math.max(1, Math.trunc(item.quantity || 1)),
    rate: Math.max(0, item.rate || 0),
  }));
}

export function InvoiceForm({
  csrfToken,
  initialData,
}: {
  csrfToken: string;
  initialData?: InvoiceFormInitialData;
}) {
  const router = useRouter();
  const [actionState, formAction, isPending] = useActionState(
    createInvoiceAction,
    initialActionState
  );
  const [items, setItems] = useState<InvoiceItem[]>(() => normalizeInitialItems(initialData));
  const [taxRate, setTaxRate] = useState(initialData?.taxRate ?? 8);
  const [discountType, setDiscountType] = useState<"none" | "percent" | "fixed">(
    initialData?.discountType ?? "none"
  );
  const [discountValue, setDiscountValue] = useState(initialData?.discountValue ?? 0);
  const [invoiceNo] = useState(() => initialData?.invoiceNo || createDefaultInvoiceNumber());
  const [currency, setCurrency] = useState(initialData?.currency ?? "USD");
  const [logoStoredUrl, setLogoStoredUrl] = useState(initialData?.companyLogoUrl ?? "");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(initialData?.companyLogoUrl ?? "");
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [companyName, setCompanyName] = useState(initialData?.companyName ?? "Your Company");
  const [invoiceTitle, setInvoiceTitle] = useState(initialData?.title ?? "INVOICE");
  const [companyEmail, setCompanyEmail] = useState(initialData?.companyEmail ?? "");
  const [companyPhone, setCompanyPhone] = useState(initialData?.companyPhone ?? "");
  const [companyAddress, setCompanyAddress] = useState(initialData?.companyAddress ?? "");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadMessage, setLogoUploadMessage] = useState("");
  const [customerName, setCustomerName] = useState(initialData?.customerName ?? "");
  const [customerEmail, setCustomerEmail] = useState(initialData?.customerEmail ?? "");
  const [customerPhone, setCustomerPhone] = useState(initialData?.customerPhone ?? "");
  const [savedCustomers, setSavedCustomers] = useState<SavedCustomer[]>([]);
  const objectPreviewUrlRef = useRef<string | null>(null);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.rate,
      0
    );
    const discount =
      discountType === "percent"
        ? subtotal * (Math.min(100, discountValue) / 100)
        : discountType === "fixed"
          ? discountValue
          : 0;
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const tax = discountedSubtotal * (taxRate / 100);

    return {
      subtotal: discountedSubtotal,
      discount: Math.min(subtotal, discount),
      tax,
      total: discountedSubtotal + tax,
    };
  }, [discountType, discountValue, items, taxRate]);

  function updateItem(
    id: string,
    field: keyof InvoiceItem,
    value: string | number
  ) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  function addItem() {
    setItems((currentItems) => [...currentItems, createItem()]);
  }

  function removeItem(id: string) {
    setItems((currentItems) => {
      if (currentItems.length === 1) {
        return currentItems;
      }

      return currentItems.filter((item) => item.id !== id);
    });
  }

  async function onLogoFileChange(file: File | undefined) {
    if (!file) return;
    setLogoUploadMessage("");
    if (objectPreviewUrlRef.current) {
      URL.revokeObjectURL(objectPreviewUrlRef.current);
      objectPreviewUrlRef.current = null;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    objectPreviewUrlRef.current = localPreviewUrl;
    setLogoLoadFailed(false);
    setLogoPreviewUrl(localPreviewUrl);

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setLogoUploadMessage("Logo must be 4MB or less.");
      setLogoPreviewUrl(logoStoredUrl);
      setLogoLoadFailed(false);
      URL.revokeObjectURL(localPreviewUrl);
      objectPreviewUrlRef.current = null;
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
      setLogoStoredUrl(result.url);
      setLogoPreviewUrl(`${result.url}?v=${Date.now()}`);
      if (objectPreviewUrlRef.current) {
        URL.revokeObjectURL(objectPreviewUrlRef.current);
        objectPreviewUrlRef.current = null;
      }
      setLogoUploadMessage("Logo uploaded.");
    } catch {
      setLogoUploadMessage("Logo upload failed. Please try again.");
      setLogoPreviewUrl(logoStoredUrl);
      setLogoLoadFailed(false);
      if (objectPreviewUrlRef.current) {
        URL.revokeObjectURL(objectPreviewUrlRef.current);
        objectPreviewUrlRef.current = null;
      }
    } finally {
      setLogoUploading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/customers", { method: "GET", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return [];
        const json = (await response.json()) as {
          ok: boolean;
          customers?: SavedCustomer[];
        };
        return json.ok && Array.isArray(json.customers) ? json.customers : [];
      })
      .then((customers) => {
        if (!cancelled) setSavedCustomers(customers);
      })
      .catch(() => {
        if (!cancelled) setSavedCustomers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (actionState.ok) {
      router.refresh();
    }
  }, [actionState.ok, router]);

  useEffect(() => {
    return () => {
      if (objectPreviewUrlRef.current) {
        URL.revokeObjectURL(objectPreviewUrlRef.current);
      }
    };
  }, []);

  function applySavedCustomer(nextName: string) {
    const match = savedCustomers.find(
      (customer) => customer.name.toLowerCase() === nextName.trim().toLowerCase()
    );
    if (!match) return;
    setCustomerEmail(match.email ?? "");
    setCustomerPhone(match.phone ?? "");
  }

  return (
    <form action={formAction} className="rounded-lg border bg-card shadow-sm">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="discountType" value={discountType} />
      <input type="hidden" name="discountValue" value={discountValue} />
      <input type="hidden" name="companyLogoUrl" value={logoStoredUrl} />
      <div className="border-b p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-start">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="company-logo-file">
                  Logo
                </label>
                <label
                  htmlFor="company-logo-file"
                  className="relative flex size-[96px] cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-muted hover:bg-muted/80"
                >
                  {logoPreviewUrl && !logoLoadFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={logoPreviewUrl}
                      src={logoPreviewUrl}
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
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(event) => void onLogoFileChange(event.target.files?.[0])}
                />
                {logoUploadMessage ? (
                  <p className="text-xs text-muted-foreground">{logoUploadMessage}</p>
                ) : null}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="text-sm font-medium" htmlFor="company-name">
                  Company
                </label>
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
            <h2 className="text-base font-semibold">Create invoice</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add customer details, line items, and review totals before sending.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:w-80">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="invoice-number">
                Invoice no.
              </label>
              <Input
                id="invoice-number"
                name="invoiceNo"
                defaultValue={invoiceNo}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="invoice-title">
                Title
              </label>
              <Input
                id="invoice-title"
                name="title"
                value={invoiceTitle}
                onChange={(event) => setInvoiceTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="invoice-date">
                Due date
              </label>
              <Input
                id="invoice-date"
                name="dueDate"
                type="date"
                defaultValue={initialData?.dueDate ?? toDateInputValue(new Date())}
              />
            </div>
            <div className="col-span-2 space-y-2">
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
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="customer-name">
                Customer
              </label>
              <Input
                id="customer-name"
                name="customerName"
                placeholder="Customer name"
                list="saved-customers"
                value={customerName}
                required
                onChange={(event) => {
                  const nextName = event.target.value;
                  setCustomerName(nextName);
                  applySavedCustomer(nextName);
                }}
                onBlur={(event) => applySavedCustomer(event.target.value)}
              />
              <datalist id="saved-customers">
                {savedCustomers.map((customer) => (
                  <option key={`${customer.name}:${customer.email ?? ""}`} value={customer.name} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="customer-email">
                Email
              </label>
              <Input
                id="customer-email"
                name="customerEmail"
                type="email"
                placeholder="billing@example.com"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="customer-phone">
                Phone
              </label>
              <Input
                id="customer-phone"
                name="customerPhone"
                placeholder="+1 555 0199"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="invoice-status">
                Status
              </label>
              <select
                id="invoice-status"
                name="status"
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                defaultValue={initialData?.status ?? "draft"}
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

            <div className="hidden rounded-md border bg-muted/40 px-3 py-2 text-xs font-medium uppercase text-muted-foreground md:grid md:grid-cols-[minmax(220px,1fr)_96px_120px_120px_40px] md:gap-3">
              <span>Description</span>
              <span>Qty</span>
              <span>Rate</span>
              <span className="text-right">Line total</span>
              <span />
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const lineTotal = item.quantity * item.rate;

                return (
                  <div
                    key={item.id}
                    className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[minmax(220px,1fr)_96px_120px_120px_40px] md:items-center"
                  >
                    <div className="space-y-2 md:space-y-0">
                      <label
                        className="text-xs font-medium text-muted-foreground md:hidden"
                        htmlFor={`item-description-${item.id}`}
                      >
                        Item {index + 1}
                      </label>
                      <Input
                        id={`item-description-${item.id}`}
                        name={`items.${index}.description`}
                        value={item.description}
                        placeholder="Item description"
                        required
                        onChange={(event) =>
                          updateItem(item.id, "description", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2 md:space-y-0">
                      <label
                        className="text-xs font-medium text-muted-foreground md:hidden"
                        htmlFor={`item-quantity-${item.id}`}
                      >
                        Quantity
                      </label>
                      <Input
                        id={`item-quantity-${item.id}`}
                        inputMode="decimal"
                        min="0"
                        name={`items.${index}.quantity`}
                        step="1"
                        type="number"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            "quantity",
                            normalizeNumber(event.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2 md:space-y-0">
                      <label
                        className="text-xs font-medium text-muted-foreground md:hidden"
                        htmlFor={`item-rate-${item.id}`}
                      >
                        Rate
                      </label>
                      <Input
                        id={`item-rate-${item.id}`}
                        inputMode="decimal"
                        min="0"
                        name={`items.${index}.rate`}
                        step="0.01"
                        type="number"
                        value={item.rate}
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            "rate",
                            normalizeNumber(event.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <span className="text-xs font-medium text-muted-foreground md:hidden">
                        Line total
                      </span>
                      <span className="text-sm font-semibold">
                        {formatCurrency(lineTotal, currency)}
                      </span>
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
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="invoice-notes">
              Notes
            </label>
            <Textarea
              id="invoice-notes"
              name="notes"
              placeholder="Payment terms, bank details, or a short message."
              defaultValue={initialData?.notes ?? ""}
            />
          </div>
        </div>

        <aside className="h-fit rounded-lg border bg-background p-5">
          <h3 className="text-sm font-semibold">Summary</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(totals.subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="text-muted-foreground" htmlFor="tax-rate">
                Tax rate
              </label>
              <div className="flex w-28 items-center rounded-md border bg-background pr-2">
                <Input
                  id="tax-rate"
                  className="h-8 border-0 text-right shadow-none focus-visible:ring-0"
                  inputMode="decimal"
                  min="0"
                  name="taxRate"
                  step="0.01"
                  type="number"
                  value={taxRate}
                  onChange={(event) => setTaxRate(normalizeNumber(event.target.value))}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_112px] items-center gap-2">
              <label className="text-muted-foreground" htmlFor="discount-value">
                Discount
              </label>
              <select
                id="discount-type"
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={discountType}
                onChange={(event) =>
                  setDiscountType(event.target.value as "none" | "percent" | "fixed")
                }
              >
                <option value="none">None</option>
                <option value="percent">%</option>
                <option value="fixed">Fixed</option>
              </select>
              <div />
              <div className="flex w-full items-center rounded-md border bg-background pr-2">
                <Input
                  id="discount-value"
                  className="h-8 border-0 text-right shadow-none focus-visible:ring-0"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  type="number"
                  value={discountValue}
                  onChange={(event) => setDiscountValue(normalizeNumber(event.target.value))}
                  disabled={discountType === "none"}
                />
                <span className="text-xs text-muted-foreground">
                  {discountType === "percent" ? "%" : discountType === "fixed" ? currency : ""}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-medium">-{formatCurrency(totals.discount, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-medium">{formatCurrency(totals.tax, currency)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-semibold tracking-tight">
                  {formatCurrency(totals.total, currency)}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            <Button type="submit" variant="success" disabled={isPending}>
              {isPending ? "Saving..." : "Save invoice"}
            </Button>
            {actionState.ok && actionState.invoiceId ? (
              <Button asChild type="button" variant="warning">
                <a
                  href={`/api/invoices/${actionState.invoiceId}/export`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Export PDF
                </a>
              </Button>
            ) : null}
            <Button type="button" variant="info" onClick={() => setPreviewOpen(true)}>
              Preview invoice
            </Button>
          </div>
          {actionState.message ? (
            <p
              className={cn(
                "mt-4 rounded-md px-3 py-2 text-xs leading-5",
                actionState.ok
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {actionState.message}
            </p>
          ) : null}
          <p
            className={cn(
              "mt-4 rounded-md bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground",
              totals.subtotal === 0 && "text-destructive"
            )}
          >
            Totals update automatically as quantity, rate, or tax changes.
          </p>
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
                  {logoPreviewUrl && !logoLoadFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`preview-${logoPreviewUrl}`}
                      src={logoPreviewUrl}
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
                  <p className="text-sm text-muted-foreground">{invoiceNo}</p>
                  <p className="text-sm text-muted-foreground">{companyEmail}</p>
                  {companyPhone ? <p className="text-sm text-muted-foreground">{companyPhone}</p> : null}
                  {companyAddress ? <p className="text-sm text-muted-foreground">{companyAddress}</p> : null}
                </div>
              </div>
              <div className="text-left md:text-right">
                <p className="text-5xl font-light tracking-wide text-foreground/80">
                  {invoiceTitle || "INVOICE"}
                </p>
                <p className="mt-2 text-2xl font-medium text-muted-foreground"># {invoiceNo}</p>
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
