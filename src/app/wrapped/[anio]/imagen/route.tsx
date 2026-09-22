import { ImageResponse } from "next/og";
import { construirWrapped } from "@/lib/crecimiento/wrapped";

type Params = { params: Promise<{ anio: string }> };

// GET /wrapped/{anio}/imagen — tarjeta 1080×1350 para compartir (docs/proposal-crecimiento.md §1).
// Nivel DIFUSION siempre: mismo contenido para cualquiera que la pida, nada personalizado.
export async function GET(_req: Request, { params }: Params) {
  const { anio } = await params;
  const anioNum = Number.parseInt(anio, 10);
  if (!Number.isInteger(anioNum) || anio !== String(anioNum)) {
    return new Response("No encontrado", { status: 404 });
  }
  const modelo = await construirWrapped(anioNum);

  const destacados: { valor: string; label: string; color: string }[] = [
    {
      valor: `${modelo.incidentesResueltos}`,
      label: "incidentes resueltos",
      color: "#ea580c",
    },
  ];
  if (modelo.tiempoMedianoRespuestaSOSMin !== null) {
    destacados.push({
      valor: `${modelo.tiempoMedianoRespuestaSOSMin} min`,
      label: "tiempo de respuesta a un SOS",
      color: "#dc2626",
    });
  }
  destacados.push({
    valor: `${modelo.coberturaLotesPct}%`,
    label: "de cobertura del barrio",
    color: "#16a34a",
  });

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0f172a",
          padding: "72px 64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 32, color: "#94a3b8", fontWeight: 600 }}>
            VECINDAR
          </div>
          <div
            style={{
              fontSize: 56,
              color: "#f8fafc",
              fontWeight: 800,
              marginTop: 8,
            }}
          >
            {`${modelo.anio} en tu barrio`}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 56,
            marginTop: 96,
          }}
        >
          {destacados.map((d) => (
            <div key={d.label} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 96, fontWeight: 800, color: d.color }}>
                {d.valor}
              </div>
              <div style={{ fontSize: 34, color: "#cbd5e1" }}>{d.label}</div>
            </div>
          ))}
        </div>

        <div
          style={{ display: "flex", fontSize: 28, color: "#64748b", marginTop: "auto" }}
        >
          {modelo.vecinosParticipantes > 0
            ? `Gracias a los ${modelo.vecinosParticipantes} vecinos que reportaron este año`
            : "Vecindar — seguridad y gestión del barrio"}
        </div>
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
