import Link from "next/link";
import { BARRIO_CENTER } from "@/lib/barrio/constantes";
import { climaFuerte, estadoDelCielo, fondoDelCielo } from "@/lib/clima";

export async function TarjetaClima() {
  let temperatura: number;
  let estado: ReturnType<typeof estadoDelCielo>;
  let dia: { max?: number; min?: number; lluvia?: number } | null = null;
  let aviso: ReturnType<typeof climaFuerte> = null;
  try {
    const [lat, lng] = BARRIO_CENTER;
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 3000);
    const base = process.env.OPEN_METEO_URL ?? "https://api.open-meteo.com";
    const clave = process.env.OPEN_METEO_API_KEY;
    const apikey = clave ? `&apikey=${clave}` : "";
    const res = await fetch(
      `${base}/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=America/Argentina/Cordoba${apikey}`,
      { next: { revalidate: 1800 }, signal: controller.signal },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const valor = data.current.temperature_2m;
    if (!Number.isFinite(valor)) return null;
    temperatura = Math.round(valor);
    estado = estadoDelCielo(data.current.weather_code);
    if (data.daily) {
      aviso = climaFuerte(data.daily);
      const max = data.daily.temperature_2m_max?.[0];
      const min = data.daily.temperature_2m_min?.[0];
      const lluvia = data.daily.precipitation_probability_max?.[0];
      dia = {
        max: Number.isFinite(max) ? Math.round(max) : undefined,
        min: Number.isFinite(min) ? Math.round(min) : undefined,
        lluvia: Number.isFinite(lluvia) ? lluvia : undefined,
      };
    }
  } catch {
    return null;
  }

  return (
    <>
      {aviso && (
        <div className="rounded-2xl bg-amber-100 text-amber-950 px-4 py-3 mb-3">
          <p className="text-xl font-semibold">{aviso.titulo}</p>
          <p className="text-lg">{aviso.consejo}</p>
        </div>
      )}
      <Link
        href="/clima"
        className={`relative block overflow-hidden rounded-2xl ${fondoDelCielo(estado)} text-white px-4 py-3 shadow-md transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300`}
      >
        <div className="absolute -top-10 -right-8 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-4xl font-semibold leading-none tracking-tight tabular-nums">
              {temperatura}°C
            </p>
            {estado && (
              <p className="text-lg font-medium leading-snug mt-1.5">
                {estado.texto}
              </p>
            )}
          </div>
          {estado && (
            <span
              aria-hidden="true"
              className="text-4xl leading-none drop-shadow-md"
            >
              {estado.icono}
            </span>
          )}
        </div>
        {dia && (
          <p className="relative text-base text-white/90 mt-1 tabular-nums">
            {[
              dia.max !== undefined && `Máx ${dia.max}°C`,
              dia.min !== undefined && `Mín ${dia.min}°C`,
              dia.lluvia !== undefined && `Lluvia ${dia.lluvia}%`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        {dia && dia.lluvia !== undefined && dia.lluvia >= 50 && (
          <p className="relative inline-block rounded-full bg-white/10 px-3 py-0.5 text-base font-semibold mt-2">
            <span aria-hidden="true">☔</span> Llevá paraguas
          </p>
        )}
        <div className="relative flex items-center justify-between gap-3 border-t border-white/20 mt-2.5 pt-2">
          <p className="text-xs text-white/90">Datos: Open-Meteo</p>
          <p className="text-base font-semibold">Ver pronóstico ›</p>
        </div>
      </Link>
    </>
  );
}
