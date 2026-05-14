import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

type InvoicePdfInput = {
  title?: string | null;
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

const PAGE = {
  width: 595.28, // A4
  height: 841.89,
  marginX: 40,
  marginTop: 44,
  marginBottom: 36,
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
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

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function drawRightText(page: PDFPage, text: string, xRight: number, y: number, size: number, font: PDFFont, color = rgb(0.16, 0.16, 0.18)) {
  page.drawText(text, {
    x: xRight - font.widthOfTextAtSize(text, size),
    y,
    size,
    font,
    color,
  });
}

async function tryEmbedGeist(pdfDoc: PDFDocument, bold = false) {
  const filename = bold ? "Geist-Bold.ttf" : "Geist-Regular.ttf";
  const fontPath = path.join(process.cwd(), "node_modules", "next", "dist", "compiled", "@vercel", "og", filename);
  const bytes = await readFile(fontPath);
  return pdfDoc.embedFont(bytes);
}

async function getFonts(pdfDoc: PDFDocument) {
  try {
    const [regular, bold] = await Promise.all([tryEmbedGeist(pdfDoc), tryEmbedGeist(pdfDoc, true)]);
    return { regular, bold };
  } catch {
    const [regular, bold] = await Promise.all([
      pdfDoc.embedFont(StandardFonts.Helvetica),
      pdfDoc.embedFont(StandardFonts.HelveticaBold),
    ]);
    return { regular, bold };
  }
}

export async function buildInvoicePdf(input: InvoicePdfInput) {
  const pdfDoc = await PDFDocument.create();
  const { regular, bold } = await getFonts(pdfDoc);
  const pages: PDFPage[] = [];
  const contentWidth = PAGE.width - PAGE.marginX * 2;
  const addPage = () => {
    const page = pdfDoc.addPage([PAGE.width, PAGE.height]);
    pages.push(page);
    return page;
  };

  const drawTableHeader = (page: PDFPage, topY: number) => {
    const col = {
      desc: PAGE.marginX + 10,
      qty: PAGE.marginX + 338,
      rate: PAGE.marginX + 392,
      total: PAGE.marginX + 468,
    };
    page.drawRectangle({
      x: PAGE.marginX,
      y: topY - 20,
      width: contentWidth,
      height: 24,
      color: rgb(0.96, 0.96, 0.97),
    });
    page.drawText("Description", { x: col.desc, y: topY - 12, size: 10, font: bold, color: rgb(0.2, 0.2, 0.22) });
    page.drawText("Qty", { x: col.qty, y: topY - 12, size: 10, font: bold, color: rgb(0.2, 0.2, 0.22) });
    page.drawText("Rate", { x: col.rate, y: topY - 12, size: 10, font: bold, color: rgb(0.2, 0.2, 0.22) });
    page.drawText("Amount", { x: col.total, y: topY - 12, size: 10, font: bold, color: rgb(0.2, 0.2, 0.22) });
    return col;
  };

  const drawFirstPageHeader = (page: PDFPage) => {
    const topY = PAGE.height - PAGE.marginTop;
    page.drawText("InvoiceFlow", { x: PAGE.marginX, y: topY, size: 28, font: bold, color: rgb(0.12, 0.12, 0.14) });
    drawRightText(page, (input.title?.trim() || "INVOICE").toUpperCase(), PAGE.width - PAGE.marginX, topY + 2, 20, regular);
    drawRightText(page, `# ${input.invoiceNo}`, PAGE.width - PAGE.marginX, topY - 24, 12, regular, rgb(0.43, 0.43, 0.46));

    const metaY = topY - 62;
    const rightLabelX = PAGE.width - PAGE.marginX - 172;
    const rightValueX = PAGE.width - PAGE.marginX;
    const rows = [
      ["Date", fmtDate(input.createdAt)],
      ["Due", fmtDate(input.dueDate)],
      ["Status", input.status.toUpperCase()],
    ] as const;
    rows.forEach(([label, value], index) => {
      const y = metaY - index * 16;
      page.drawText(`${label}:`, { x: rightLabelX, y, size: 10, font: regular, color: rgb(0.44, 0.44, 0.47) });
      drawRightText(page, value, rightValueX, y, 10, label === "Status" ? bold : regular);
    });

    let billY = topY - 84;
    page.drawText("Bill To", { x: PAGE.marginX, y: billY, size: 11, font: regular, color: rgb(0.45, 0.45, 0.48) });
    billY -= 20;
    page.drawText(input.customer.name, { x: PAGE.marginX, y: billY, size: 14, font: bold, color: rgb(0.14, 0.14, 0.16) });
    billY -= 16;
    if (input.customer.email) {
      page.drawText(input.customer.email, { x: PAGE.marginX, y: billY, size: 10, font: regular, color: rgb(0.3, 0.3, 0.33) });
      billY -= 13;
    }
    if (input.customer.phone) {
      page.drawText(input.customer.phone, { x: PAGE.marginX, y: billY, size: 10, font: regular, color: rgb(0.3, 0.3, 0.33) });
    }

    const balanceY = topY - 170;
    page.drawRectangle({
      x: PAGE.width - PAGE.marginX - 240,
      y: balanceY,
      width: 240,
      height: 34,
      color: rgb(0.95, 0.95, 0.96),
      borderColor: rgb(0.89, 0.89, 0.91),
      borderWidth: 0.6,
    });
    page.drawText("Balance Due", { x: PAGE.width - PAGE.marginX - 228, y: balanceY + 11, size: 11, font: bold, color: rgb(0.2, 0.2, 0.22) });
    drawRightText(page, money(input.total), PAGE.width - PAGE.marginX - 12, balanceY + 11, 11, bold);
    return balanceY - 26;
  };

  const drawNextPageHeader = (page: PDFPage) => {
    const topY = PAGE.height - PAGE.marginTop;
    page.drawText(`# ${input.invoiceNo}`, { x: PAGE.marginX, y: topY, size: 11, font: bold, color: rgb(0.2, 0.2, 0.22) });
    drawRightText(page, "INVOICE ITEMS", PAGE.width - PAGE.marginX, topY, 11, regular);
    return topY - 24;
  };

  let page = addPage();
  let y = drawFirstPageHeader(page);
  const col = drawTableHeader(page, y);
  y -= 30;

  const descWidth = 320;
  const minBottomY = PAGE.marginBottom + 130;
  for (const item of input.items) {
    const lines = wrapText(item.description, regular, 10, descWidth).slice(0, 4);
    const rowHeight = Math.max(24, lines.length * 12 + 8);
    if (y - rowHeight < minBottomY) {
      page = addPage();
      y = drawNextPageHeader(page);
      drawTableHeader(page, y);
      y -= 30;
    }
    page.drawRectangle({
      x: PAGE.marginX,
      y: y - rowHeight + 4,
      width: contentWidth,
      height: rowHeight,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.9, 0.9, 0.92),
      borderWidth: 0.6,
    });
    lines.forEach((line, index) => {
      page.drawText(line, {
        x: col.desc,
        y: y - 10 - index * 12,
        size: 10,
        font: regular,
        color: rgb(0.17, 0.17, 0.2),
      });
    });
    page.drawText(String(item.quantity), { x: col.qty + 2, y: y - 10, size: 10, font: regular, color: rgb(0.2, 0.2, 0.22) });
    drawRightText(page, money(item.price), col.total - 12, y - 10, 10, regular);
    drawRightText(page, money(item.total), PAGE.width - PAGE.marginX - 10, y - 10, 10, bold);
    y -= rowHeight + 4;
  }

  const notesLines = input.notes ? wrapText(input.notes, regular, 10, 280).slice(0, 8) : [];
  const notesHeight = notesLines.length ? 26 + notesLines.length * 12 : 0;
  const totalsHeight = 98;
  const neededHeight = Math.max(notesHeight, totalsHeight) + 18;
  if (y - neededHeight < PAGE.marginBottom + 8) {
    page = addPage();
    y = drawNextPageHeader(page) - 18;
  }

  const sectionTop = y;
  if (notesLines.length) {
    page.drawText("Notes", { x: PAGE.marginX, y: sectionTop - 2, size: 11, font: bold, color: rgb(0.2, 0.2, 0.22) });
    notesLines.forEach((line, index) => {
      page.drawText(line, {
        x: PAGE.marginX,
        y: sectionTop - 18 - index * 12,
        size: 10,
        font: regular,
        color: rgb(0.35, 0.35, 0.38),
      });
    });
  }

  const totalsX = PAGE.width - PAGE.marginX - 220;
  const totalsY = sectionTop - totalsHeight + 8;
  page.drawRectangle({
    x: totalsX,
    y: totalsY,
    width: 220,
    height: totalsHeight,
    color: rgb(0.97, 0.97, 0.98),
    borderColor: rgb(0.9, 0.9, 0.92),
    borderWidth: 0.8,
  });
  page.drawText("Subtotal", { x: totalsX + 12, y: totalsY + 72, size: 10, font: regular, color: rgb(0.3, 0.3, 0.33) });
  drawRightText(page, money(input.subtotal), totalsX + 208, totalsY + 72, 10, regular);
  page.drawText("Tax", { x: totalsX + 12, y: totalsY + 54, size: 10, font: regular, color: rgb(0.3, 0.3, 0.33) });
  drawRightText(page, money(input.tax), totalsX + 208, totalsY + 54, 10, regular);
  page.drawLine({
    start: { x: totalsX + 12, y: totalsY + 42 },
    end: { x: totalsX + 208, y: totalsY + 42 },
    thickness: 0.7,
    color: rgb(0.86, 0.86, 0.89),
  });
  page.drawText("Total", { x: totalsX + 12, y: totalsY + 22, size: 12, font: bold, color: rgb(0.14, 0.14, 0.16) });
  drawRightText(page, money(input.total), totalsX + 208, totalsY + 22, 12, bold);

  pages.forEach((page, index) => {
    page.drawLine({
      start: { x: PAGE.marginX, y: PAGE.marginBottom + 8 },
      end: { x: PAGE.width - PAGE.marginX, y: PAGE.marginBottom + 8 },
      thickness: 0.6,
      color: rgb(0.9, 0.9, 0.92),
    });
    page.drawText("Generated by InvoiceFlow", {
      x: PAGE.marginX,
      y: PAGE.marginBottom - 6,
      size: 9,
      font: regular,
      color: rgb(0.52, 0.52, 0.56),
    });
    drawRightText(page, `${index + 1}/${pages.length}`, PAGE.width - PAGE.marginX, PAGE.marginBottom - 6, 9, regular, rgb(0.52, 0.52, 0.56));
  });

  return pdfDoc.save();
}
