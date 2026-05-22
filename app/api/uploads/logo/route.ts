import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { auth } from "@/auth";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
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
    return NextResponse.json({ ok: false, message: "Image must be 4MB or less." }, { status: 400 });
  }

  const ext = extensionFor(file.type);
  const filename = `${Date.now()}-${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  // Production-safe path: persist logo in Vercel Blob when token is available.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`logos/${filename}`, bytes, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });

    return NextResponse.json({
      ok: true,
      url: blob.url,
    });
  }

  // Local dev fallback: write under /public for immediate preview.
  const uploadDir = path.join(process.cwd(), "public", "uploads", "logos");
  await mkdir(uploadDir, { recursive: true });
  const outputPath = path.join(uploadDir, filename);
  await writeFile(outputPath, bytes);

  return NextResponse.json({
    ok: true,
    url: `/uploads/logos/${filename}`,
  });
}
