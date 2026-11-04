export async function TarjetaClima() {
  let temperatura: number;
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?current=temperature_2m,weather_code",
    );
    const data = await res.json();
    temperatura = Math.round(data.current.temperature_2m);
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
