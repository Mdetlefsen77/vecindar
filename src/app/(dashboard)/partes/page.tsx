import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { esGestor, GESTORES_PARTES } from "@/lib/permisos";
import { RONDA_LABEL, TURNOS, fechaParteLabel } from "@/lib/partes";
import TituloSeccion from "@/components/ui/TituloSeccion";

export const metadata = { title: "Partes de la guardia" };

export default async function PartesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const puedeCargar = esGestor(session.user.role, GESTORES_PARTES);

  const partes = await prisma.parteTurno.findMany({
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    take: 60,
    select: {
      id: true,
      fecha: true,
      turno: true,
      ronda: true,
      novedades: true,
      imagenes: true,
    },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <TituloSeccion seccion="partes">Partes de la guardia</TituloSeccion>
          <p className="text-sm text-gray-500">
            Resumen de cada turno de patrullaje en el barrio
          </p>
        </div>
        {puedeCargar && (
          <Link
            href="/partes/nuevo"
            className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            + Cargar parte
          </Link>
        )}
      </div>

      {partes.length === 0 ? (
        <p className="text-center text-gray-500 py-12">
          Todavía no hay partes cargados.
        </p>
      ) : (
        <ul className="space-y-2">
          {partes.map((p) => (
            <li key={p.id}>
              <Link
                href={`/partes/${p.id}`}
                className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3 hover:shadow-sm transition-shadow"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">
                    Turno {TURNOS[p.turno].label.toLowerCase()}
                    <span className="font-normal text-gray-500">
                      {" "}
                      · {fechaParteLabel(p.fecha)}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    Ronda {RONDA_LABEL[p.ronda].toLowerCase()}
                    {p.imagenes.length > 0 && ` · 📸 ${p.imagenes.length}`}
                    {p.novedades && ` · ${p.novedades.split("\n")[0]}`}
                  </p>
                </div>
                <span
                  className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    p.novedades
                      ? "bg-amber-100 text-amber-800"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {p.novedades ? "Con novedades" : "Sin novedades"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
