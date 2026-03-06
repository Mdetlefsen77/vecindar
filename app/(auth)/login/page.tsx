"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email o contraseña incorrectos");
      } else {
        router.push("/mapa");
        router.refresh();
      }
    } catch {
      setError("Ocurrió un error. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-brand-surface px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center shadow-lg mb-4">
            <span className="text-white text-2xl font-black tracking-tight">
              V
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Vecindar
          </h1>
          <p className="mt-1 text-sm text-gray-500">Tu barrio conectado</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 border border-red-200 px-4 py-3"
              >
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors duration-150"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors duration-150"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] bg-brand hover:bg-brand-dark active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿No tenés cuenta?{" "}
          <a
            href="/registro"
            className="font-semibold text-brand hover:text-brand-dark transition-colors duration-150"
          >
            Registrate aquí
          </a>
        </p>
      </div>
    </div>
  );
}
