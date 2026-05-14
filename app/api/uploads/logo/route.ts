import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { auth } from "@/auth";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  if (type === "image/svg+xml") return "svg";
  return "bin";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "No file uploaded." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ ok: false, message: "Unsupported image format." }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ ok: false, message: "Image must be 5MB or less." }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "logos");
  await mkdir(uploadDir, { recursive: true });

  const ext = extensionFor(file.type);
  const filename = `${Date.now()}-${randomUUID()}.${ext}`;
  const outputPath = path.join(uploadDir, filename);
  const bytes = Buffer.from(await file.arrayBuffer());

  await writeFile(outputPath, bytes);

  return NextResponse.json({
    ok: true,
    url: `/uploads/logos/${filename}`,
  });
}
