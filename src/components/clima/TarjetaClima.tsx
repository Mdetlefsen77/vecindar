export async function TarjetaClima() {
  const res = await fetch(
    "https://api.open-meteo.com/v1/forecast?current=temperature_2m,weather_code",
  );
  const data = await res.json();
  const temperatura = Math.round(data.current.temperature_2m);

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
