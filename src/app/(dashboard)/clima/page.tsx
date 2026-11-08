import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BARRIO_CENTER } from "@/lib/barrio/constantes";
import {
  COLOR_CLIMA,
  estadoDelCielo,
  fondoDelCielo,
  nombreDelDia,
} from "@/lib/clima";

export default async function ClimaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [lat, lng] = BARRIO_CENTER;
  const base = process.env.OPEN_METEO_URL ?? "https://api.open-meteo.com";
  const clave = process.env.OPEN_METEO_API_KEY;
  const apikey = clave ? `&apikey=${clave}` : "";
  const error = (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm px-4 py-4 space-y-2">
        <p className="text-lg font-semibold text-gray-900">
          No pudimos traer el pronóstico, probá más tarde
        </p>
        <Link
          href="/inicio"
          className={`inline-block text-base font-semibold ${COLOR_CLIMA.enlace} underline underline-offset-4`}
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
  let res: Response;
  let data;
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 3000);
  try {
    res = await fetch(
      `${base}/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=4&timezone=America/Argentina/Cordoba${apikey}`,
      { next: { revalidate: 1800 }, signal: controller.signal },
    );
    if (!res.ok) return error;
    data = await res.json();
  } catch {
    return error;
  }
  const d = data?.daily;
  if (!d || !d.time || d.time.length < 4) return error;

  const dias = [1, 2, 3].map((i) => {
    const estado = estadoDelCielo(d.weather_code?.[i]);
    const max = d.temperature_2m_max?.[i];
    const min = d.temperature_2m_min?.[i];
    const lluvia = d.precipitation_probability_max?.[i];
    return {
      nombre: i === 1 ? "Mañana" : nombreDelDia(d.time[i]),
      estado,
      max: Number.isFinite(max) ? Math.round(max) : undefined,
      min: Number.isFinite(min) ? Math.round(min) : undefined,
      lluvia: Number.isFinite(lluvia) ? lluvia : undefined,
    };
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl ${COLOR_CLIMA.chip}`}
          >
            🌤️
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Pronóstico</h1>
        </div>
        <p className="text-sm text-gray-500">
          Los próximos 3 días en el barrio
        </p>
      </div>
      <ul className="space-y-2.5">
        {dias.map((dia) => (
          <li
            key={dia.nombre}
            className={`relative overflow-hidden rounded-2xl ${fondoDelCielo(dia.estado)} text-white px-4 py-3 shadow-md`}
          >
            <div className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-snug">
                  {dia.nombre}
                </p>
                {dia.estado && (
                  <p className="text-base font-medium text-white/90 leading-snug">
                    {dia.estado.texto}
                  </p>
                )}
                <p className="text-base text-white/90 leading-snug mt-1 tabular-nums">
                  {[
                    dia.max !== undefined && `Máx ${dia.max}°C`,
                    dia.min !== undefined && `Mín ${dia.min}°C`,
                    dia.lluvia !== undefined && `Lluvia ${dia.lluvia}%`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {dia.estado && (
                <span
                  aria-hidden="true"
                  className="text-4xl leading-none drop-shadow-md"
                >
                  {dia.estado.icono}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-600">Datos: Open-Meteo</p>
    </div>
  );
}
