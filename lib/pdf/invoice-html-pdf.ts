import { chromium } from "playwright";
import { access } from "node:fs/promises";

type InvoicePdfInput = {
  title?: string | null;
  companyName?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  companyAddress?: string | null;
  companyLogoUrl?: string | null;
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

function esc(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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

function renderInvoiceHtml(input: InvoicePdfInput) {
  const title = esc((input.title?.trim() || "INVOICE").toUpperCase());
  const companyName = esc(input.companyName?.trim() || "Your Company");
  const companyEmail = esc(input.companyEmail?.trim() || "company@example.com");
  const companyPhone = esc(input.companyPhone?.trim() || "");
  const companyAddress = esc(input.companyAddress?.trim() || "");
  const logoUrl = (input.companyLogoUrl ?? "").trim();
  const logoNode = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="Company logo" style="width:56px;height:56px;border-radius:16px;object-fit:cover;display:block;" />`
    : "IF";
  const status = esc(input.status.toUpperCase());
  const notes = esc(input.notes?.trim() || "Thank you for your business.");
  const itemRows = input.items
    .map((item) => {
      return `
        <tr>
          <td>
            <div class="item-title">${esc(item.description || "Untitled item")}</div>
          </td>
          <td>${item.quantity}</td>
          <td>${esc(money(item.price))}</td>
          <td>${esc(money(item.total))}</td>
        </tr>
      `;
    })
    .join("");

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      @page{size:A4;margin:0}
      *{box-sizing:border-box}
      html,body{width:210mm;height:297mm}
      body{margin:0;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;color:#111;background:#fff}
      .page{padding:8mm;margin:0;width:210mm;height:297mm}
      .card{
        border:1px solid #d9dde3;
        border-radius:26px;
        overflow:hidden;
        background:#fff;
        width:100%;
        height:100%;
      }
      .top{background:linear-gradient(135deg,#0f1115,#1a1d23);color:#fff;padding:38px 38px 34px}
      .top-flex{display:flex;justify-content:space-between;gap:24px}
      .brand{display:flex;gap:14px;align-items:flex-start}
      .logo{width:56px;height:56px;border-radius:16px;background:#262a31;display:flex;align-items:center;justify-content:center;font-weight:700;overflow:hidden}
      .company{font-weight:800;font-size:27px;line-height:1;letter-spacing:-.02em}
      .muted{color:#c2c6cf;font-size:12px;margin-top:6px}
      .head{text-align:right}
      .head h1{margin:0;font-size:50px;line-height:1;letter-spacing:-.03em}
      .id{font-size:15px;margin-top:6px;color:#d3d6dd}
      .status{display:inline-block;margin-top:16px;padding:8px 13px;border-radius:999px;background:#262a31;font-size:11px;font-weight:700;letter-spacing:.03em}
      .body{padding:30px}
      .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:20px}
      .ibox{background:#f7f8fa;border:1px solid #e6e9ee;border-radius:16px;padding:16px}
      .label{font-size:10px;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
      .ibox h3{margin:0 0 6px 0;font-size:15px}
      .ibox p{margin:0;font-size:12px;color:#4b5563;line-height:1.6}
      table{width:100%;border-collapse:separate;border-spacing:0}
      thead th{background:#111317;color:#fff;font-size:11px;text-align:left;padding:12px}
      thead th:first-child{border-top-left-radius:10px}
      thead th:last-child{border-top-right-radius:10px}
      tbody td{padding:13px 12px;border-bottom:1px solid #e8ebf0;font-size:12px;color:#16181d}
      tbody tr:nth-child(even){background:#fafbfc}
      .item-title{font-weight:600}
      .bottom{display:grid;grid-template-columns:1.2fr .8fr;gap:14px;margin-top:20px}
      .notes{background:#f7f8fa;border:1px solid #e6e9ee;border-radius:16px;padding:16px}
      .notes h3{margin:0 0 8px 0;font-size:14px}
      .notes p{margin:0;color:#4b5563;font-size:12px;line-height:1.68}
      .sum{background:#121418;color:#fff;border-radius:18px;padding:16px}
      .sum h3{margin:0 0 12px 0;font-size:14px}
      .row{display:flex;justify-content:space-between;padding:7px 0;font-size:12px;border-bottom:1px solid rgba(255,255,255,.1)}
      .row:last-child{border-bottom:0}
      .total{font-weight:800;font-size:16px}
      .foot{margin-top:14px;font-size:11px;color:#667085;text-align:center}
    </style>
  </head>
  <body>
    <div class="page">
      <div class="card">
        <div class="top">
          <div class="top-flex">
            <div class="brand">
              <div class="logo">${logoNode}</div>
              <div>
                <div class="company">${companyName}</div>
                <div class="muted">${companyEmail}</div>
                ${companyPhone ? `<div class="muted">${companyPhone}</div>` : ""}
                ${companyAddress ? `<div class="muted">${companyAddress}</div>` : ""}
              </div>
            </div>
            <div class="head">
              <h1>${title}</h1>
              <div class="id">#${esc(input.invoiceNo)}</div>
              <div class="status">${status}</div>
            </div>
          </div>
        </div>
        <div class="body">
          <div class="grid3">
            <div class="ibox">
              <div class="label">Bill From</div>
              <h3>${companyName}</h3>
              <p>${companyEmail}${companyPhone ? `<br/>${companyPhone}` : ""}${companyAddress ? `<br/>${companyAddress}` : ""}</p>
            </div>
            <div class="ibox">
              <div class="label">Bill To</div>
              <h3>${esc(input.customer.name)}</h3>
              <p>${esc(input.customer.email || "-")}<br/>${esc(input.customer.phone || "-")}</p>
            </div>
            <div class="ibox">
              <div class="label">Invoice Meta</div>
              <h3>${esc(fmtDate(input.createdAt))}</h3>
              <p>Due: ${esc(fmtDate(input.dueDate))}<br/>Currency: USD</p>
            </div>
          </div>

          <table>
            <thead>
              <tr><th>Service</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <div class="bottom">
            <div class="notes">
              <h3>Notes</h3>
              <p>${notes}</p>
            </div>
            <div class="sum">
              <h3>Invoice Summary</h3>
              <div class="row"><span>Subtotal</span><strong>${esc(money(input.subtotal))}</strong></div>
              <div class="row"><span>Tax</span><strong>${esc(money(input.tax))}</strong></div>
              <div class="row total"><span>Total</span><span>${esc(money(input.total))}</span></div>
            </div>
          </div>
          <div class="foot">This invoice was generated digitally and is valid without signature.</div>
        </div>
      </div>
    </div>
  </body>
</html>
`;
}

export async function buildInvoicePdfFromHtml(input: InvoicePdfInput) {
  const html = renderInvoiceHtml(input);
  const browser = await launchBestBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      const images = Array.from(document.images);
      await Promise.all(
        images.map((image) => {
          if (image.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          });
        })
      );
    });
    return await page.pdf({
      format: "A4",
      preferCSSPageSize: true,
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
  } finally {
    await browser.close();
  }
}

export function resolveLogoUrl(logoUrl: string | null | undefined, baseUrl: string) {
  const value = (logoUrl ?? "").trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${baseUrl.replace(/\/$/, "")}${value}`;
  return value;
}

async function canUse(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function launchBestBrowser() {
  const attempts: Array<() => Promise<Awaited<ReturnType<typeof chromium.launch>>>> = [
    () => chromium.launch({ headless: true, channel: "msedge" }),
    () => chromium.launch({ headless: true, channel: "chrome" }),
  ];

  const executableCandidates = [
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];

  for (const executablePath of executableCandidates) {
    if (await canUse(executablePath)) {
      attempts.push(() => chromium.launch({ headless: true, executablePath }));
    }
  }

  let lastError: unknown;
  for (const launch of attempts) {
    try {
      return await launch();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("No browser available for HTML PDF rendering.");
}
