/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://cms2.devback.website";

/**
 * POST /api/upload — Upload an image file
 *
 * The file is forwarded to the Yii2 backend's upload endpoint so it is
 * saved on the **remote production server** and immediately accessible at
 * https://cms2.devback.website/uploads/...
 *
 * No local copy is saved — Vercel's serverless filesystem is read-only.
 *
 * FormData:
 *  - file       : File
 *  - record_id  : string  (optional — ID of the record to link in ag_attachment)
 *  - table_name : string  (optional — table name for ag_attachment)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const recordId = formData.get("record_id") as string | null;
    const tableName = formData.get("table_name") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
    ];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed` },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    // ── 1. Read file & compress (images only) ─────────────────────────
    const rawBytes = await file.arrayBuffer();
    let buffer = Buffer.from(rawBytes);
    let uploadName = file.name;
    let uploadType = file.type;

    const isImage = file.type.startsWith("image/") && file.type !== "image/gif";
    if (isImage) {
      try {
        // Resize to max 1200px wide, convert to JPEG at 75% quality
        const compressed = await sharp(buffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .jpeg({ quality: 75, mozjpeg: true })
          .toBuffer();

        const savedPct = Math.round(
          ((buffer.length - compressed.length) / buffer.length) * 100
        );
        console.log(
          `Image compressed: ${(buffer.length / 1024).toFixed(0)}KB → ${(compressed.length / 1024).toFixed(0)}KB (-${savedPct}%)`
        );

        buffer = compressed;
        // Update name/type to reflect JPEG output
        uploadName = file.name.replace(/\.[^.]+$/, ".jpg");
        uploadType = "image/jpeg";
      } catch (compErr) {
        console.warn("Image compression failed, uploading original:", compErr);
      }
    }

    // ── 2. Forward file to the remote backend ──────────────────────────
    const remoteForm = new FormData();
    const blob = new Blob([buffer], { type: uploadType });
    remoteForm.append("file", blob, uploadName);

    const backendRes = await fetch(`${BACKEND_URL}/v2_0_0-upload/upload`, {
      method: "POST",
      body: remoteForm,
    });

    if (!backendRes.ok) {
      const errText = await backendRes.text();
      console.error("Backend upload failed:", backendRes.status, errText);
      return NextResponse.json(
        { error: "Backend upload failed: " + errText },
        { status: 502 }
      );
    }

    const backendJson = (await backendRes.json()) as {
      success: boolean;
      url?: string;
      filename?: string;
      error?: string;
    };

    if (!backendJson.success || !backendJson.url) {
      console.error("Backend upload unsuccessful:", backendJson);
      return NextResponse.json(
        { error: backendJson.error || "Backend upload returned no URL" },
        { status: 502 }
      );
    }

    // Extract relative path from the full URL returned by the backend
    // e.g. "https://cms2.devback.website/uploads/abc.png" → "/uploads/abc.png"
    let relativePath: string;
    try {
      const parsed = new URL(backendJson.url);
      relativePath = parsed.pathname; // "/uploads/abc.png"
    } catch {
      // Fallback: strip the origin manually
      relativePath = backendJson.url.replace(BACKEND_URL, "");
    }

    const fileName = backendJson.filename || relativePath.split("/").pop()!;
    const ext = fileName.split(".").pop() || "jpg";

    // ── 3. Optionally create ag_attachment record ──────────────────────
    if (recordId && tableName) {
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO ag_attachment (table_name, row_id, type, file_path, file_name, file_extension, file_size, cdn_uploaded, created_at)
           VALUES (?, ?, 1, ?, ?, ?, ?, 0, NOW())`,
          tableName,
          Number.parseInt(recordId),
          relativePath,
          fileName,
          ext,
          file.size.toString()
        );
      } catch (error_) {
        console.error("ag_attachment insert error (file saved):", error_);
      }
    }

    return NextResponse.json({
      success: true,
      file_path: relativePath,
      file_name: fileName,
      file_size: file.size,
      remote_url: backendJson.url,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
