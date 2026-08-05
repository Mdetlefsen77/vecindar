import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api/guard";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

const BUCKET = "images";

export async function POST(req: NextRequest) {
  const guard = await requireSession("No autenticado.");
  if (guard.response) return guard.response;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No se recibió un archivo." },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Tipo de archivo no permitido. Solo imágenes (JPG, PNG, WEBP, GIF, HEIC)." },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "El archivo supera el límite de 5 MB." },
      { status: 400 },
    );
  }

  const ext = MIME_EXT[file.type] ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, Buffer.from(bytes), {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Supabase storage upload error:", error);
    return NextResponse.json(
      { error: "Error al subir el archivo." },
      { status: 500 },
    );
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);

  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}
