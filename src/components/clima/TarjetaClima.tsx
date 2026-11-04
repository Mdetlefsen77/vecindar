export async function TarjetaClima() {
  let temperatura: number;
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?current=temperature_2m,weather_code",
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
