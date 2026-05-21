import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type InvoiceItemInput = {
  description: string;
  quantity: number;
  price: number;
};

export type InvoiceInput = {
  invoiceNo: string;
  title?: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyLogoUrl?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  status?: string;
  dueDate?: Date | null;
  notes?: string;
  taxRate?: number;
  discountType?: "none" | "percent" | "fixed";
  discountValue?: number;
  items: InvoiceItemInput[];
};

export type DashboardInvoice = {
  id: string;
  invoiceNo: string;
  customer: string;
  date: string;
  amount: string;
  status: string;
};

export type DashboardStats = {
  revenue: number;
  outstanding: number;
  paidInvoices: number;
  drafts: number;
};

export type DashboardData = {
  stats: DashboardStats;
  invoices: DashboardInvoice[];
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function cleanOptional(value?: string) {
  const cleanValue = value?.trim();

  return cleanValue ? cleanValue : null;
}

function normalizeItems(items: InvoiceItemInput[]) {
  return items
    .map((item) => ({
      description: item.description.trim(),
      quantity: Math.max(0, Math.trunc(item.quantity)),
      price: Math.max(0, item.price),
    }))
    .filter((item) => item.description && item.quantity > 0);
}

function getTotals(
  items: InvoiceItemInput[],
  taxRate = 0,
  discountType: "none" | "percent" | "fixed" = "none",
  discountValue = 0
) {
  const rawSubtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  const safeDiscountValue = Math.max(0, discountValue);
  const discount =
    discountType === "percent"
      ? rawSubtotal * (Math.min(100, safeDiscountValue) / 100)
      : discountType === "fixed"
        ? safeDiscountValue
        : 0;
  const subtotal = Math.max(0, rawSubtotal - discount);
  const tax = subtotal * (Math.max(0, taxRate) / 100);

  return {
    rawSubtotal,
    discount: Math.min(rawSubtotal, discount),
    subtotal,
    tax,
    total: subtotal + tax,
  };
}

async function findOrCreateCustomer(input: InvoiceInput) {
  const email = cleanOptional(input.customerEmail);
  const existingCustomer = email
    ? await prisma.customer.findFirst({ where: { email } })
    : null;

  if (existingCustomer) {
    return prisma.customer.update({
      where: { id: existingCustomer.id },
      data: {
        name: input.customerName.trim(),
        phone: cleanOptional(input.customerPhone),
      },
      select: { id: true },
    });
  }

  return prisma.customer.create({
    data: {
      name: input.customerName.trim(),
      email,
      phone: cleanOptional(input.customerPhone),
    },
    select: { id: true },
  });
}

export async function listInvoices(userId: string, isAdmin = false) {
  return prisma.invoice.findMany({
    where: isAdmin ? undefined : { userId },
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      items: {
        orderBy: { id: "asc" },
      },
    },
  });
}

export async function getInvoice(id: string, userId: string, isAdmin = false) {
  return prisma.invoice.findFirst({
    where: { id, ...(isAdmin ? {} : { userId }) },
    include: {
      customer: true,
      items: true,
    },
  });
}

export async function createInvoice(input: InvoiceInput, userId: string) {
  const items = normalizeItems(input.items);

  if (!input.invoiceNo.trim()) {
    throw new Error("Invoice number is required.");
  }

  if (!input.customerName.trim()) {
    throw new Error("Customer name is required.");
  }

  if (items.length === 0) {
    throw new Error("Add at least one invoice item.");
  }

  const customer = await findOrCreateCustomer(input);
  const totals = getTotals(items, input.taxRate, input.discountType, input.discountValue);

  try {
    return await prisma.invoice.create({
      data: {
        invoiceNo: input.invoiceNo.trim(),
        title: cleanOptional(input.title),
        companyName: cleanOptional(input.companyName),
        companyEmail: cleanOptional(input.companyEmail),
        companyPhone: cleanOptional(input.companyPhone),
        companyAddress: cleanOptional(input.companyAddress),
        companyLogoUrl: cleanOptional(input.companyLogoUrl),
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        status: input.status ?? "draft",
        dueDate: input.dueDate ?? null,
        notes: cleanOptional(input.notes),
        userId,
        customerId: customer.id,
        items: {
          create: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
          })),
        },
      },
      include: {
        customer: true,
        items: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("Invoice number already exists. Please use a new number.");
    }

    throw error;
  }
}

export async function updateInvoice(
  id: string,
  input: InvoiceInput,
  userId: string,
  isAdmin = false
) {
  const items = normalizeItems(input.items);

  if (items.length === 0) {
    throw new Error("Add at least one invoice item.");
  }

  const customer = await findOrCreateCustomer(input);
  const totals = getTotals(items, input.taxRate, input.discountType, input.discountValue);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: { id, ...(isAdmin ? {} : { userId }) },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("Invoice not found.");
    }

    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

    try {
      return await tx.invoice.update({
        where: { id },
        data: {
          invoiceNo: input.invoiceNo.trim(),
          title: cleanOptional(input.title),
          companyName: cleanOptional(input.companyName),
          companyEmail: cleanOptional(input.companyEmail),
          companyPhone: cleanOptional(input.companyPhone),
          companyAddress: cleanOptional(input.companyAddress),
          companyLogoUrl: cleanOptional(input.companyLogoUrl),
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
          status: input.status ?? "draft",
          dueDate: input.dueDate ?? null,
          notes: cleanOptional(input.notes),
          customerId: customer.id,
          items: {
            create: items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              price: item.price,
              total: item.quantity * item.price,
            })),
          },
        },
        include: {
          customer: true,
          items: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new Error("Invoice number already exists. Please use a new number.");
      }

      throw error;
    }
  });
}

export async function deleteInvoice(id: string, userId: string, isAdmin = false) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: { id, ...(isAdmin ? {} : { userId }) },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("Invoice not found.");
    }

    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

    return tx.invoice.delete({ where: { id } });
  });
}

export async function getDashboardData(userId: string, isAdmin = false): Promise<DashboardData> {
  const scope = isAdmin ? {} : { userId };
  const invoices = await prisma.invoice.findMany({
    where: scope,
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { customer: true },
  });

  const [paidRevenue, outstanding, paidInvoices, drafts] = await Promise.all([
    prisma.invoice.aggregate({
      where: { ...scope, status: "paid" },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { ...scope, status: { in: ["sent", "overdue"] } },
      _sum: { total: true },
    }),
    prisma.invoice.count({ where: { ...scope, status: "paid" } }),
    prisma.invoice.count({ where: { ...scope, status: "draft" } }),
  ]);

  return {
    stats: {
      revenue: paidRevenue._sum.total ?? 0,
      outstanding: outstanding._sum.total ?? 0,
      paidInvoices,
      drafts,
    },
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNo: invoice.invoiceNo,
      customer: invoice.customer.name,
      date: dateFormatter.format(invoice.createdAt),
      amount: currencyFormatter.format(invoice.total),
      status: invoice.status,
    })),
  };
}
