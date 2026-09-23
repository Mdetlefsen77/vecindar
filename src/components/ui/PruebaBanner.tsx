import Link from "next/link";

/**
 * Aviso para la cuenta aprobada "con prueba" (src/lib/prueba.ts): cuánto le
 * queda y que la app es paga. No se puede cerrar — es la parte del mensaje
 * que tiene que llegar siempre. Vencida la prueba, el layout redirige a
 * /prueba-finalizada en lugar de mostrar esto.
 */
export default function PruebaBanner({
  horas,
  vence,
}: {
  horas: number;
  /** Fin de la prueba ya formateado (hora de Argentina). */
  vence: string;
}) {
  return (
    <div
      role="status"
      className="mx-3 mt-3 sm:mx-4 sm:mt-4 md:mx-6 md:mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 print:hidden"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none" aria-hidden>
          ⏳
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-900">
            Estás en período de prueba: te{" "}
            {horas === 1 ? "queda 1 hora" : `quedan ${horas} horas`}
          </p>
          <p className="mt-1 text-sm text-blue-800">
            Vecindar funciona con una suscripción mensual. Tu prueba termina el{" "}
            {vence}; para seguir usando la app después, pagá tu primera cuota.
          </p>
          <Link
            href="/mi-suscripcion"
            className="mt-3 min-h-[36px] inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            Ver cómo suscribirme
          </Link>
        </div>
      </div>
    </div>
  );
}
