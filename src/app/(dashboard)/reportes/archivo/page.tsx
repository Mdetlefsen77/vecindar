import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { esGestor, GESTORES_REPORTES } from "@/lib/permisos";
import { listarArchivados } from "@/lib/reportes/archivo";
import { nombreCompleto } from "@/lib/usuarios";

const NIVEL_LABEL: Record<string, string> = {
  INTERNO: "Interno",
  INSTITUCIONAL: "Institucional",
  DIFUSION: "Difusión",
};

// HU-06 CA-06.2 — listado de reportes archivados, descargables (en pantalla,
// desde ahí "Exportar a PDF" con los datos ya congelados).
export default async function ArchivoReportesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!esGestor(session.user.role, GESTORES_REPORTES)) redirect("/");

  const reportes = await listarArchivados();

  return (
    <div className="max-w-3xl mx-auto px-3 py-4 sm:px-6 sm:py-6 space-y-4">
      <div>
        <Link
          href="/reportes"
          className="text-sm text-blue-600 hover:underline font-medium"
        >
          ‹ Volver al reporte
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          Archivo de reportes
        </h1>
      </div>

      {reportes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center text-gray-500 text-sm">
          Todavía no se archivó ningún reporte.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
          {reportes.map((r) => {
            const anio = r.periodoInicio.getUTCFullYear();
            const mes = r.periodoInicio.getUTCMonth() + 1;
            return (
              <Link
                key={r.id}
                href={`/reportes?anio=${anio}&mes=${mes}&nivel=${r.nivel}`}
                className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">
                    N° {String(r.numero).padStart(4, "0")} —{" "}
                    {r.periodoInicio.toLocaleDateString("es-AR", {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {NIVEL_LABEL[r.nivel] ?? r.nivel} · generado por{" "}
                    {nombreCompleto(r.generadoPor)} ·{" "}
                    {r.generadoAt.toLocaleDateString("es-AR")}
                  </p>
                  {r.nota && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      &quot;{r.nota}&quot;
                    </p>
                  )}
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
                  {NIVEL_LABEL[r.nivel] ?? r.nivel}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
