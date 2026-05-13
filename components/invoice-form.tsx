"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

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

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function createItem(): InvoiceItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    rate: 0,
  };
}

function formatCurrency(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
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

export function InvoiceForm() {
  const [actionState, formAction, isPending] = useActionState(
    createInvoiceAction,
    initialActionState
  );
  const [items, setItems] = useState<InvoiceItem[]>(defaultItems);
  const [taxRate, setTaxRate] = useState(8);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.rate,
      0
    );
    const tax = subtotal * (taxRate / 100);

    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }, [items, taxRate]);

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

  return (
    <form action={formAction} className="rounded-lg border bg-card shadow-sm">
      <div className="border-b p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
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
                defaultValue="INV-1049"
                required
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
                defaultValue="2026-05-26"
              />
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
                required
              />
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
                defaultValue="draft"
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
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
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
                        {formatCurrency(lineTotal)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
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
            />
          </div>
        </div>

        <aside className="h-fit rounded-lg border bg-background p-5">
          <h3 className="text-sm font-semibold">Summary</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
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
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-medium">{formatCurrency(totals.tax)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-semibold tracking-tight">
                  {formatCurrency(totals.total)}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save invoice"}
            </Button>
            <Button type="button" variant="outline">
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
    </form>
  );
}
