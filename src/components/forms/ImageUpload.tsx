"use client";

import { useRef, useState } from "react";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BaseProps {
  label?: string;
  className?: string;
}

interface SingleProps extends BaseProps {
  multiple?: false;
  value: string | null;
  onChange: (url: string | null) => void;
  maxFiles?: never;
}

interface MultipleProps extends BaseProps {
  multiple: true;
  value: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
}

type Props = SingleProps | MultipleProps;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImageUpload(props: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isMultiple = props.multiple === true;
  const maxFiles = isMultiple ? ((props as MultipleProps).maxFiles ?? 3) : 1;

  const urls: string[] = isMultiple
    ? (props as MultipleProps).value
    : (props as SingleProps).value
      ? [(props as SingleProps).value as string]
      : [];

  const canAdd = urls.length < maxFiles && !uploading;

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Error al subir imagen.");
    return data.url!;
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setUploadError(null);
    setUploading(true);

    try {
      if (!isMultiple) {
        const url = await uploadFile(files[0]);
        (props as SingleProps).onChange(url);
      } else {
        const p = props as MultipleProps;
        const remaining = maxFiles - p.value.length;
        const toUpload = files.slice(0, remaining);
        const newUrls = await Promise.all(toUpload.map(uploadFile));
        p.onChange([...p.value, ...newUrls]);
      }
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : "Error desconocido al subir.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    if (!isMultiple) {
      (props as SingleProps).onChange(null);
    } else {
      const p = props as MultipleProps;
      p.onChange(p.value.filter((_, i) => i !== index));
    }
  }

  return (
    <div className={props.className ?? ""}>
      {props.label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {props.label}{" "}
          <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
      )}

      {/* Previews */}
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {urls.map((url, i) => (
            <div
              key={url}
              className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 group flex-shrink-0"
            >
              <Image
                src={url}
                alt={`imagen ${i + 1}`}
                fill
                className="object-cover"
                sizes="96px"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                aria-label="Eliminar imagen"
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs
                           flex items-center justify-center shadow
                           opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}

          {/* Skeleton while uploading, shown alongside existing */}
          {uploading && (
            <div className="w-24 h-24 rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-gray-400 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Add button — shown when there are no images yet (with spinner) or when canAdd */}
      {urls.length === 0 && uploading ? (
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-blue-300 rounded-xl text-sm text-blue-500 w-full">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Subiendo imagen...
        </div>
      ) : canAdd ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center justify-center gap-2 px-4 py-3 w-full
                     border-2 border-dashed border-gray-300 rounded-xl
                     text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500
                     active:scale-[0.98] transition-all"
        >
          {/* Camera icon */}
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {urls.length === 0
            ? "Agregar foto"
            : `Agregar otra foto (${urls.length}/${maxFiles})`}
        </button>
      ) : null}

      {uploadError && (
        <p className="text-xs text-red-600 mt-1.5">{uploadError}</p>
      )}

      {/* Hidden file input — accepts any image, allows gallery picker AND camera on mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={isMultiple}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
