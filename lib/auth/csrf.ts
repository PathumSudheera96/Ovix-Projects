import { cookies, headers } from "next/headers";
import { timingSafeEqual } from "node:crypto";

export const CSRF_COOKIE = "invoiceflow-csrf";
const CSRF_FIELD = "csrfToken";

export function safeCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function getCsrfToken() {
  const cookieStore = await cookies();
  const requestHeaders = await headers();

  return cookieStore.get(CSRF_COOKIE)?.value ?? requestHeaders.get("x-csrf-token") ?? "";
}

export async function assertValidCsrf(formData: FormData) {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  const bodyToken = formData.get(CSRF_FIELD);

  if (!cookieToken || typeof bodyToken !== "string" || !safeCompare(cookieToken, bodyToken)) {
    throw new Error("Invalid security token. Refresh the page and try again.");
  }
}

export const csrfFieldName = CSRF_FIELD;
