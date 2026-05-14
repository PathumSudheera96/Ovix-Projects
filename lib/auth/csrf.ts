import { cookies, headers } from "next/headers";

export const CSRF_COOKIE = "invoiceflow-csrf";
const CSRF_FIELD = "csrfToken";

function safeCompare(a: string, b: string) {
  return a.length === b.length && a === b;
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
