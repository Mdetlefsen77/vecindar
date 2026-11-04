import { BARRIO_CENTER } from "@/lib/barrio/constantes";
import { estadoDelCielo } from "@/lib/clima";

export async function TarjetaClima() {
  let temperatura: number;
  let estado: ReturnType<typeof estadoDelCielo>;
  let dia: { max: number; min: number; lluvia: number } | null = null;
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
    if (typeof valor !== "number") return null;
    temperatura = Math.round(valor);
    estado = estadoDelCielo(data.current.weather_code);
    if (data.daily) {
      dia = {
        max: Math.round(data.daily.temperature_2m_max[0]),
        min: Math.round(data.daily.temperature_2m_min[0]),
        lluvia: data.daily.precipitation_probability_max[0],
      };
    }
  } catch {
    return null;
  }

  return (
    <div className="rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 px-4 py-3">
      <p className="text-5xl font-bold leading-none">{temperatura}°C</p>
      {estado && (
        <p className="text-2xl font-semibold mt-1">
          <span aria-hidden="true">{estado.icono}</span> {estado.texto}
        </p>
      )}
      {dia && (
        <p className="text-xl font-semibold mt-1">
          Máx {dia.max}°C · Mín {dia.min}°C · Lluvia {dia.lluvia}%
        </p>
      )}
      <p className="text-xs text-sky-800 mt-1">Datos: Open-Meteo</p>
    </div>
  );
}
