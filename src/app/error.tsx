"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center">
      <div className="text-5xl">⚠️</div>
      <h2 className="text-xl font-bold text-gray-900">Ocurrió un error</h2>
      <p className="text-sm text-gray-500 max-w-sm">
        {error.message || "Algo salió mal. Intentá de nuevo."}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}
