"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Lote {
  id: number;
  numero: string;
  calleFrente: string;
  manzana: { numero: string; zona: string };
}

export default function RegistroPage() {
  const router = useRouter();

  // Campos del formulario
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [loteId, setLoteId] = useState("");

  // Estado UI
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Cargar lotes disponibles
  useEffect(() => {
    fetch("/api/lotes?disponibles=true")
      .then((res) => res.json())
      .then((data) => setLotes(data.lotes ?? []))
      .catch(() => setError("No se pudieron cargar los lotes disponibles."))
      .finally(() => setLoadingLotes(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (!loteId) {
      setError("Debés seleccionar tu lote.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password, telefono, loteId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Ocurrió un error. Intentá nuevamente.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Ocurrió un error de red. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            ¡Registro enviado!
          </h2>
          <p className="text-gray-600">
            Tu solicitud fue recibida. Un administrador deberá aprobar tu cuenta
            antes de que puedas ingresar.
          </p>
          <p className="text-sm text-gray-500">
            Te avisaremos por email cuando tu cuenta esté activa.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        {/* Header */}
        <div>
          <h2 className="text-center text-4xl font-extrabold text-gray-900">
            Vecindar Univ 3
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Registrate para unirte a tu barrio
          </p>
        </div>

        {/* Formulario */}
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Nombre completo */}
          <div>
            <label
              htmlFor="nombre"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              id="nombre"
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Juan García"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="tu@email.com"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label
              htmlFor="telefono"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Teléfono{" "}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              id="telefono"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="+54 351 000-0000"
            />
          </div>

          {/* Lote */}
          <div>
            <label
              htmlFor="lote"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Tu lote / unidad <span className="text-red-500">*</span>
            </label>
            {loadingLotes ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-400 text-sm bg-gray-50">
                Cargando lotes disponibles...
              </div>
            ) : lotes.length === 0 ? (
              <div className="w-full px-3 py-2 border border-yellow-300 rounded-md text-yellow-700 text-sm bg-yellow-50">
                No hay lotes disponibles. Contactá al administrador.
              </div>
            ) : (
              <select
                id="lote"
                required
                value={loteId}
                onChange={(e) => setLoteId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
              >
                <option value="">Seleccioná tu lote...</option>
                {lotes.map((lote) => (
                  <option key={lote.id} value={lote.id}>
                    Manzana {lote.manzana.numero} ({lote.manzana.zona}) — Lote{" "}
                    {lote.numero} · {lote.calleFrente}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Contraseña <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label
              htmlFor="confirmarPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirmar contraseña <span className="text-red-500">*</span>
            </label>
            <input
              id="confirmarPassword"
              type="password"
              required
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Repetí tu contraseña"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || loadingLotes || lotes.length === 0}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Registrando..." : "Solicitar registro"}
          </button>

          <p className="text-center text-sm text-gray-600">
            ¿Ya tenés cuenta?{" "}
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Iniciá sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
