import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BARRIO_CENTER } from "@/lib/barrio/constantes";
import { estadoDelCielo, nombreDelDia } from "@/lib/clima";

export default async function ClimaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [lat, lng] = BARRIO_CENTER;
  const base = process.env.OPEN_METEO_URL ?? "https://api.open-meteo.com";
  const clave = process.env.OPEN_METEO_API_KEY;
  const apikey = clave ? `&apikey=${clave}` : "";
  const error = (
    <div className="p-4 space-y-3">
      <p className="text-2xl font-semibold">
        No pudimos traer el pronóstico, probá más tarde
      </p>
      <Link href="/inicio" className="block text-xl font-semibold underline">
        Volver al inicio
      </Link>
    </div>
  );
  let res: Response;
  try {
    res = await fetch(
      `${base}/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=4&timezone=America/Argentina/Cordoba${apikey}`,
      { next: { revalidate: 1800 } },
    );
  } catch {
    return error;
  }
  if (!res.ok) return error;
  const data = await res.json();
  const d = data.daily;

  const dias = [1, 2, 3].map((i) => {
    const estado = estadoDelCielo(d.weather_code[i]);
    const max = d.temperature_2m_max[i];
    const min = d.temperature_2m_min[i];
    const lluvia = d.precipitation_probability_max[i];
    return {
      nombre: i === 1 ? "Mañana" : nombreDelDia(d.time[i]),
      estado,
      max: Number.isFinite(max) ? Math.round(max) : undefined,
      min: Number.isFinite(min) ? Math.round(min) : undefined,
      lluvia: Number.isFinite(lluvia) ? lluvia : undefined,
    };
  });

  return (
    <div className="p-4 space-y-3">
      {dias.map((dia) => (
        <div
          key={dia.nombre}
          className="rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 px-4 py-3"
        >
          <p className="text-2xl font-bold">{dia.nombre}</p>
          {dia.estado && (
            <p className="text-2xl font-semibold mt-1">
              <span aria-hidden="true">{dia.estado.icono}</span>{" "}
              {dia.estado.texto}
            </p>
          )}
          <p className="text-xl font-semibold mt-1">
            {[
              dia.max !== undefined && `Máx ${dia.max}°C`,
              dia.min !== undefined && `Mín ${dia.min}°C`,
              dia.lluvia !== undefined && `Lluvia ${dia.lluvia}%`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      ))}
      <p className="text-xs text-sky-800">Datos: Open-Meteo</p>
    </div>
  );
}
