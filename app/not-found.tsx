import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center">
      <div className="text-5xl">🔍</div>
      <h2 className="text-2xl font-bold text-gray-900">Página no encontrada</h2>
      <p className="text-sm text-gray-500 max-w-sm">
        No encontramos lo que buscabas.
      </p>
      <Link
        href="/inicio"
        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
