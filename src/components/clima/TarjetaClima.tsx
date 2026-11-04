import { BARRIO_CENTER } from "@/lib/barrio/constantes";

export async function TarjetaClima() {
  let temperatura: number;
  try {
    const [lat, lng] = BARRIO_CENTER;
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 3000);
    const base = process.env.OPEN_METEO_URL ?? "https://api.open-meteo.com";
    const clave = process.env.OPEN_METEO_API_KEY;
    const apikey = clave ? `&apikey=${clave}` : "";
    const res = await fetch(
      `${base}/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code${apikey}`,
      { next: { revalidate: 1800 }, signal: controller.signal },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const valor = data.current.temperature_2m;
    if (typeof valor !== "number") return null;
    temperatura = Math.round(valor);
  } catch {
    return null;
  }

  return (
    <div>
      <p>{temperatura}°C</p>
      <p>
        <span>⛅</span> Parcialmente nublado
      </p>
      <p>Datos: Open-Meteo</p>
    </div>
  );
}
