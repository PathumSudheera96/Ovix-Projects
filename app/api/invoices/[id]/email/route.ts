import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { sendInvoiceEmail } from "@/lib/email";
import { buildInvoicePdfBytesForUser } from "@/lib/pdf/invoice-export";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const isAdmin = session.user.role === "ADMIN";
  const baseUrl = new URL(request.url).origin;

  const payload = await buildInvoicePdfBytesForUser({
    invoiceId: id,
    userId: session.user.id,
    isAdmin,
    baseUrl,
  }).catch(() => null);

  if (!payload) {
    return NextResponse.json({ ok: false, message: "Invoice not found" }, { status: 404 });
  }

  const recipient = payload.invoice.customer.email?.trim();
  if (!recipient) {
    return NextResponse.json(
      { ok: false, message: "Customer email is missing for this invoice." },
      { status: 400 }
    );
  }

  const subject = `Invoice ${payload.invoice.invoiceNo}`;
  const html = `
    <p>Hello ${payload.invoice.customer.name},</p>
    <p>Please find attached invoice <strong>${payload.invoice.invoiceNo}</strong>.</p>
    <p>Thank you.</p>
  `;

  try {
    await sendInvoiceEmail({
      to: recipient,
      subject,
      html,
      attachmentName: `invoice-${payload.invoice.invoiceNo}.pdf`,
      attachmentBytes: payload.bytes,
    });
    return NextResponse.json({ ok: true, message: "Invoice email sent." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send invoice email.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
