import { notFound } from "next/navigation";
import { construirWrapped } from "@/lib/crecimiento/wrapped";
import WrappedAcciones from "@/components/crecimiento/WrappedAcciones";

type Params = { params: Promise<{ anio: string }> };

// Página pública (sin auth) — nivel DIFUSION del Wrapped anual, pensada para
// compartir. Ver docs/proposal-crecimiento.md §1.
export default async function WrappedPage({ params }: Params) {
  const { anio } = await params;
  const anioNum = Number.parseInt(anio, 10);
  if (!Number.isInteger(anioNum) || anio !== String(anioNum)) notFound();
  const modelo = await construirWrapped(anioNum);
  const imagenUrl = `/wrapped/${anioNum}/imagen`;

  const tarjetas: { valor: string; label: string; color: string }[] = [
    {
      valor: `${modelo.incidentesResueltos}`,
      label: "incidentes resueltos",
      color: "#fb923c",
    },
  ];
  if (modelo.tiempoMedianoRespuestaSOSMin !== null) {
    tarjetas.push({
      valor: `${modelo.tiempoMedianoRespuestaSOSMin} min`,
      label: "tiempo mediano de respuesta a una alerta SOS",
      color: "#f87171",
    });
  }
  tarjetas.push({
    valor: `${modelo.coberturaLotesPct}%`,
    label: "de cobertura del barrio",
    color: "#4ade80",
  });
  if (modelo.manzanaMasActiva) {
    tarjetas.push({
      valor: `Manzana ${modelo.manzanaMasActiva.numero}`,
      label: `fue la más activa este año (${modelo.manzanaMasActiva.zona})`,
      color: "#60a5fa",
    });
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-lg mx-auto px-5 py-10 space-y-8">
        <div>
          <p className="text-sm font-semibold tracking-wide text-slate-400">
            VECINDAR
          </p>
          <h1 className="text-3xl font-extrabold mt-1">
            {modelo.anio} en tu barrio
          </h1>
        </div>

        <div className="space-y-6">
          {tarjetas.map((t) => (
            <div key={t.label} className="border-b border-slate-800 pb-6">
              <p className="text-5xl font-extrabold" style={{ color: t.color }}>
                {t.valor}
              </p>
              <p className="text-slate-300 mt-1">{t.label}</p>
            </div>
          ))}
        </div>

        <p className="text-slate-400 text-sm">
          {modelo.vecinosParticipantes > 0
            ? `Gracias a los ${modelo.vecinosParticipantes} vecinos que reportaron este año.`
            : "Vecindar — seguridad y gestión del barrio."}
        </p>

        <WrappedAcciones anio={modelo.anio} imagenUrl={imagenUrl} />
      </div>
    </div>
  );
}
