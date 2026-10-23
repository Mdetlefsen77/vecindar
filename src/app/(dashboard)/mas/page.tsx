import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import IconoSeccion, { type IconoNombre } from "@/components/ui/IconoSeccion";
import { SECCIONES, type Seccion } from "@/lib/secciones";
import { esGestor, GESTORES_REPORTES } from "@/lib/permisos";

export const metadata = { title: "Todas las secciones" };

// Todas las secciones en botones grandes, para el "Más" de la barra de abajo.
// Mismo color e ícono que en Inicio. Mapa no va: ya tiene botón en la barra.
const SECCIONES_MAS: { seccion: Seccion; descripcion: string }[] = [
  { seccion: "avisos", descripcion: "Lo que pasa ahora en el barrio" },
  { seccion: "incidentes", descripcion: "Robos y hechos de seguridad" },
  { seccion: "requerimientos", descripcion: "Reclamos para arreglar algo" },
  { seccion: "mascotas", descripcion: "Perdidas y encontradas" },
  { seccion: "oficios", descripcion: "Plomeros, clases, tortas y más" },
  { seccion: "partes", descripcion: "Lo que reporta la guardia" },
];

const PANEL_POR_ROL: Record<string, { href: string; label: string }> = {
  ADMIN: { href: "/admin", label: "Panel de administración" },
  SEGURIDAD: { href: "/seguridad", label: "Panel de Seguridad" },
  TESORERO: { href: "/admin/cobranza", label: "Cobranza" },
};

function FilaCuenta({
  href,
  icono,
  label,
}: {
  href: string;
  icono: IconoNombre;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 min-h-[56px] px-4 py-3 text-base font-semibold text-gray-900 hover:bg-gray-50"
    >
      <span className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
        <IconoSeccion nombre={icono} />
      </span>
      <span className="flex-1">{label}</span>
      <span aria-hidden="true" className="text-2xl text-gray-400">
        ›
      </span>
    </Link>
  );
}

export default async function MasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const rol = session.user.role;
  const panel = PANEL_POR_ROL[rol];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Todas las secciones</h1>

      <ul className="grid grid-cols-2 gap-3">
        {SECCIONES_MAS.map(({ seccion, descripcion }) => {
          const estilo = SECCIONES[seccion];
          return (
            <li key={seccion} className="flex">
              <Link
                href={estilo.href}
                className="flex-1 flex flex-col gap-2 min-h-[132px] p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-gray-300 active:scale-[0.98] transition-all"
              >
                <span
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${estilo.chip}`}
                >
                  <IconoSeccion nombre={seccion} className="w-7 h-7" />
                </span>
                <span className="text-lg font-bold text-gray-900 leading-tight">
                  {estilo.label}
                </span>
                <span className="text-sm text-gray-600 leading-snug">
                  {descripcion}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <section className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        <h2 className="sr-only">Tu cuenta</h2>
        <FilaCuenta
          href="/mi-suscripcion"
          icono="suscripcion"
          label="Mi suscripción"
        />
        {panel && (
          <FilaCuenta href={panel.href} icono="inicio" label={panel.label} />
        )}
        {esGestor(rol, GESTORES_REPORTES) && (
          <FilaCuenta href="/reportes" icono="partes" label="Reportes" />
        )}
      </section>
    </div>
  );
}
