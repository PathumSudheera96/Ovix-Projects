"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function InvoiceEmailSendButton({ invoiceId }: { invoiceId: string }) {
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");

  async function onSend() {
    setIsSending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/email`, {
        method: "POST",
      });
      const result = (await response.json()) as { ok: boolean; message?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "Failed to send.");
      }
      setMessage("Email sent");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Send failed");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Button type="button" size="sm" variant="secondary" onClick={onSend} disabled={isSending}>
        {isSending ? "Sending..." : "Send Email"}
      </Button>
      {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
    </div>
  );
}
