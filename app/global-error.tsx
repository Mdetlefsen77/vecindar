"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center bg-gray-50">
        <div className="text-5xl">💥</div>
        <h2 className="text-xl font-bold text-gray-900">Error crítico</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          La aplicación encontró un error inesperado.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
