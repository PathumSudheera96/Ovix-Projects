import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type InvoicePdfInput = {
  invoiceNo: string;
  createdAt: Date;
  dueDate: Date | null;
  status: string;
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
  };
  items: Array<{
    description: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function fmtDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export async function buildInvoicePdf(input: InvoicePdfInput) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const width = page.getWidth();
  let y = page.getHeight() - 48;

  page.drawText("INVOICE", {
    x: width - 170,
    y,
    size: 34,
    font: regular,
    color: rgb(0.2, 0.2, 0.22),
  });
  y -= 38;
  page.drawText(`# ${input.invoiceNo}`, {
    x: width - 170,
    y,
    size: 18,
    font: regular,
    color: rgb(0.45, 0.45, 0.48),
  });

  page.drawText("InvoiceFlow", {
    x: 48,
    y: page.getHeight() - 58,
    size: 24,
    font: bold,
    color: rgb(0.12, 0.12, 0.14),
  });
  page.drawText(`Date: ${fmtDate(input.createdAt)}`, {
    x: width - 170,
    y: y - 34,
    size: 12,
    font: regular,
    color: rgb(0.45, 0.45, 0.48),
  });
  page.drawText(`Due: ${fmtDate(input.dueDate)}`, {
    x: width - 170,
    y: y - 52,
    size: 12,
    font: regular,
    color: rgb(0.45, 0.45, 0.48),
  });
  page.drawText(`Status: ${input.status}`, {
    x: width - 170,
    y: y - 70,
    size: 12,
    font: regular,
    color: rgb(0.45, 0.45, 0.48),
  });

  let leftY = page.getHeight() - 130;
  page.drawText("Bill To:", {
    x: 48,
    y: leftY,
    size: 12,
    font: regular,
    color: rgb(0.45, 0.45, 0.48),
  });
  leftY -= 22;
  page.drawText(input.customer.name, {
    x: 48,
    y: leftY,
    size: 18,
    font: bold,
    color: rgb(0.14, 0.14, 0.16),
  });
  leftY -= 22;
  if (input.customer.email) {
    page.drawText(input.customer.email, {
      x: 48,
      y: leftY,
      size: 12,
      font: regular,
      color: rgb(0.28, 0.28, 0.3),
    });
    leftY -= 16;
  }
  if (input.customer.phone) {
    page.drawText(input.customer.phone, {
      x: 48,
      y: leftY,
      size: 12,
      font: regular,
      color: rgb(0.28, 0.28, 0.3),
    });
  }

  // Balance due banner
  page.drawRectangle({
    x: width - 290,
    y: page.getHeight() - 190,
    width: 240,
    height: 34,
    color: rgb(0.93, 0.93, 0.94),
    borderRadius: 6,
  });
  page.drawText(`Balance Due: ${money(input.total)}`, {
    x: width - 272,
    y: page.getHeight() - 178,
    size: 16,
    font: bold,
    color: rgb(0.16, 0.16, 0.18),
  });

  // Items table
  let tableY = page.getHeight() - 250;
  page.drawText("Description", { x: 48, y: tableY, size: 11, font: bold });
  page.drawText("Qty", { x: 330, y: tableY, size: 11, font: bold });
  page.drawText("Rate", { x: 390, y: tableY, size: 11, font: bold });
  page.drawText("Total", { x: 500, y: tableY, size: 11, font: bold });
  tableY -= 10;
  page.drawLine({
    start: { x: 48, y: tableY },
    end: { x: width - 48, y: tableY },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.87),
  });
  tableY -= 20;

  for (const item of input.items) {
    if (tableY < 140) break;
    page.drawText(item.description, { x: 48, y: tableY, size: 11, font: regular });
    page.drawText(String(item.quantity), { x: 330, y: tableY, size: 11, font: regular });
    page.drawText(money(item.price), { x: 390, y: tableY, size: 11, font: regular });
    page.drawText(money(item.total), { x: 500, y: tableY, size: 11, font: regular });
    tableY -= 18;
  }

  const totalsY = 120;
  page.drawText(`Subtotal: ${money(input.subtotal)}`, {
    x: width - 210,
    y: totalsY,
    size: 11,
    font: regular,
  });
  page.drawText(`Tax: ${money(input.tax)}`, {
    x: width - 210,
    y: totalsY - 18,
    size: 11,
    font: regular,
  });
  page.drawText(`Grand Total: ${money(input.total)}`, {
    x: width - 210,
    y: totalsY - 40,
    size: 13,
    font: bold,
  });

  if (input.notes) {
    page.drawText("Notes", { x: 48, y: 110, size: 12, font: bold });
    page.drawText(input.notes.slice(0, 220), {
      x: 48,
      y: 92,
      size: 10,
      font: regular,
      color: rgb(0.35, 0.35, 0.38),
      maxWidth: 320,
      lineHeight: 13,
    });
  }

  return pdfDoc.save();
}
