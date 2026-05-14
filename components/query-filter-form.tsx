"use client";

import { FormEvent, ReactNode, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  className?: string;
  children: ReactNode;
};

export function QueryFilterForm({ className, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      const text = String(value).trim();
      if (text) params.set(key, text);
    }

    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    startTransition(() => {
      router.replace(url);
    });
  }

  return (
    <form className={className} onSubmit={onSubmit} data-pending={isPending ? "true" : "false"}>
      {children}
    </form>
  );
}
