"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { assertValidCsrf } from "@/lib/auth/csrf";
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
  const discountType = readString(formData, "discountType");

  return {
    invoiceNo: readString(formData, "invoiceNo"),
    customerName: readString(formData, "customerName"),
    customerEmail: readString(formData, "customerEmail"),
    customerPhone: readString(formData, "customerPhone"),
    status: readString(formData, "status") || "draft",
    dueDate: dueDate ? new Date(`${dueDate}T00:00:00`) : null,
    notes: readString(formData, "notes"),
    taxRate: readNumber(formData, "taxRate"),
    discountType:
      discountType === "percent" || discountType === "fixed"
        ? discountType
        : "none",
    discountValue: readNumber(formData, "discountValue"),
    items: readInvoiceItems(formData),
  };
}

const invoiceInputSchema = z.object({
  invoiceNo: z.string().trim().min(1).max(50),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(254).or(z.literal("")),
  customerPhone: z.string().trim().max(30).or(z.literal("")),
  status: z.enum(["draft", "sent", "paid", "overdue"]),
  dueDate: z.date().nullable(),
  notes: z.string().max(1000),
  taxRate: z.number().min(0).max(100),
  discountType: z.enum(["none", "percent", "fixed"]),
  discountValue: z.number().min(0).max(100000000),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(200),
        quantity: z.number().int().min(1).max(100000),
        price: z.number().min(0).max(100000000),
      })
    )
    .min(1),
});
const invoiceStatusSchema = z.enum(["draft", "sent", "paid", "overdue"]);

function parseInvoiceInput(formData: FormData): InvoiceInput {
  const parsed = invoiceInputSchema.safeParse(readInvoiceInput(formData));

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid invoice input.");
  }

  return parsed.data;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

async function getSessionScope() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized.");
  }

  return {
    userId: session.user.id,
    isAdmin: session.user.role === "ADMIN",
  };
}

async function ensureCsrf(formData: FormData): Promise<string | null> {
  try {
    await assertValidCsrf(formData);
    return null;
  } catch {
    return "Security token expired. Refresh and try again.";
  }
}

export async function createInvoiceAction(
  _state: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  try {
    const csrfError = await ensureCsrf(formData);
    if (csrfError) {
      return { ok: false, message: csrfError };
    }
    const scope = await getSessionScope();
    const invoice = await createInvoice(parseInvoiceInput(formData), scope.userId);

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
    const csrfError = await ensureCsrf(formData);
    if (csrfError) {
      return { ok: false, message: csrfError };
    }
    const scope = await getSessionScope();
    const invoice = await updateInvoice(
      id,
      parseInvoiceInput(formData),
      scope.userId,
      scope.isAdmin
    );

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

export async function updateInvoiceStatusAction(id: string, status: string) {
  const parsed = invoiceStatusSchema.safeParse(status);
  if (!parsed.success) {
    throw new Error("Invalid status.");
  }

  const scope = await getSessionScope();
  const invoice = await getInvoice(id, scope.userId, scope.isAdmin);

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  await updateInvoice(
    id,
    {
      invoiceNo: invoice.invoiceNo,
      customerName: invoice.customer.name,
      customerEmail: invoice.customer.email ?? "",
      customerPhone: invoice.customer.phone ?? "",
      status: parsed.data,
      dueDate: invoice.dueDate,
      notes: invoice.notes ?? "",
      taxRate: invoice.subtotal > 0 ? (invoice.tax / invoice.subtotal) * 100 : 0,
      discountType: "none",
      discountValue: 0,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        price: item.price,
      })),
    },
    scope.userId,
    scope.isAdmin
  );

  revalidatePath("/");
  revalidatePath("/invoices");
}

export async function deleteInvoiceAction(id: string) {
  const scope = await getSessionScope();
  await deleteInvoice(id, scope.userId, scope.isAdmin);
  revalidatePath("/");
}

export async function getInvoiceAction(id: string) {
  const scope = await getSessionScope();
  return getInvoice(id, scope.userId, scope.isAdmin);
}

export async function listInvoicesAction() {
  const scope = await getSessionScope();
  return listInvoices(scope.userId, scope.isAdmin);
}
