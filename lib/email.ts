import { env } from "@/lib/env";

type SendInvoiceEmailArgs = {
  to: string;
  subject: string;
  html: string;
  attachmentName: string;
  attachmentBytes: Uint8Array;
};

export function canSendEmail() {
  return Boolean(
    env.SMTP_HOST &&
      env.SMTP_PORT &&
      env.SMTP_USER &&
      env.SMTP_PASS &&
      env.SMTP_FROM
  );
}

export async function sendInvoiceEmail({
  to,
  subject,
  html,
  attachmentName,
  attachmentBytes,
}: SendInvoiceEmailArgs) {
  if (!canSendEmail()) {
    throw new Error("SMTP settings are missing. Configure SMTP_* environment variables.");
  }

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html,
    attachments: [
      {
        filename: attachmentName,
        content: Buffer.from(attachmentBytes),
        contentType: "application/pdf",
      },
    ],
  });
}
