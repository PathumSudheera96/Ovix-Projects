"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { updateInvoiceStatusAction } from "@/app/actions/invoices";

const statuses = ["draft", "sent", "paid", "overdue"] as const;

export function InvoiceStatusSelect({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <select
      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
      defaultValue={status}
      disabled={isPending}
      onChange={(event) => {
        const nextStatus = event.target.value;
        startTransition(() => {
          void updateInvoiceStatusAction(invoiceId, nextStatus).then(() => router.refresh());
        });
      }}
    >
      {statuses.map((value) => (
        <option key={value} value={value}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </option>
      ))}
    </select>
  );
}
