"use server";

import { revalidatePath } from "next/cache";

import {
  createInvoice,
  deleteInvoice,
  getInvoice,
  listInvoices,
  updateInvoice,
  type InvoiceInput,
  type InvoiceItemInput,
} from "@/lib/invoices";

export type InvoiceActionState = {
  ok: boolean;
  message: string;
};

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readNumber(formData: FormData, key: string) {
  const value = Number(readString(formData, key));

  return Number.isFinite(value) ? value : 0;
}

function readInvoiceItems(formData: FormData): InvoiceItemInput[] {
  const indexes = new Set<number>();

  for (const key of formData.keys()) {
    const match = key.match(/^items\.(\d+)\./);

    if (match) {
      indexes.add(Number(match[1]));
    }
  }

  return Array.from(indexes)
    .sort((a, b) => a - b)
    .map((index) => ({
      description: readString(formData, `items.${index}.description`),
      quantity: readNumber(formData, `items.${index}.quantity`),
      price: readNumber(formData, `items.${index}.rate`),
    }));
}

function readInvoiceInput(formData: FormData): InvoiceInput {
  const dueDate = readString(formData, "dueDate");

  return {
    invoiceNo: readString(formData, "invoiceNo"),
    customerName: readString(formData, "customerName"),
    customerEmail: readString(formData, "customerEmail"),
    customerPhone: readString(formData, "customerPhone"),
    status: readString(formData, "status") || "draft",
    dueDate: dueDate ? new Date(`${dueDate}T00:00:00`) : null,
    notes: readString(formData, "notes"),
    taxRate: readNumber(formData, "taxRate"),
    items: readInvoiceItems(formData),
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

export async function createInvoiceAction(
  _state: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  try {
    const invoice = await createInvoice(readInvoiceInput(formData));

    revalidatePath("/");

    return {
      ok: true,
      message: `Invoice ${invoice.invoiceNo} saved.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function updateInvoiceAction(
  id: string,
  _state: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  try {
    const invoice = await updateInvoice(id, readInvoiceInput(formData));

    revalidatePath("/");

    return {
      ok: true,
      message: `Invoice ${invoice.invoiceNo} updated.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function deleteInvoiceAction(id: string) {
  await deleteInvoice(id);
  revalidatePath("/");
}

export async function getInvoiceAction(id: string) {
  return getInvoice(id);
}

export async function listInvoicesAction() {
  return listInvoices();
}
