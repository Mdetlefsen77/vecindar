"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import IconoSeccion, { type IconoNombre } from "@/components/ui/IconoSeccion";
import { SECCIONES } from "@/lib/secciones";

interface NavItem {
  href: string;
  label: string;
  icono: IconoNombre;
  /** Color del ícono y del texto cuando está activo: el de su sección. */
  activo: string;
  isSos?: boolean;
}

// Lo que se usa todo el tiempo desde cualquier pantalla. El resto de las
// secciones está en Inicio y en "Más".
const NAV_ITEMS: NavItem[] = [
  {
    href: "/inicio",
    label: "Inicio",
    icono: "inicio",
    activo: "text-blue-700",
  },
  {
    href: "/avisos",
    label: SECCIONES.avisos.label,
    icono: "avisos",
    activo: SECCIONES.avisos.texto,
  },
  {
    href: "/panico",
    label: "SOS",
    icono: "sos",
    activo: "text-red-700",
    isSos: true,
  },
  {
    href: "/mapa",
    label: SECCIONES.mapa.label,
    icono: "mapa",
    activo: SECCIONES.mapa.texto,
  },
  { href: "/mas", label: "Más", icono: "mas", activo: "text-gray-900" },
];

function enRuta(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export default function BottomNav() {
  const pathname = usePathname();
  // "Más" queda marcado en las secciones que no tienen botón propio acá,
  // así el vecino sabe por dónde volver.
  const enBarra = NAV_ITEMS.some(
    (i) => i.href !== "/mas" && enRuta(pathname, i.href),
  );

  return (
    <nav
      aria-label="Navegación principal"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 bottom-nav-safe print:hidden"
    >
      <div className="flex items-end justify-around h-bottom-nav">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/mas" ? !enBarra : enRuta(pathname, item.href);

          if (item.isSos) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className="flex flex-col items-center justify-center -mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 rounded-full"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                    isActive ? "bg-red-700" : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  <span className="text-white">
                    <IconoSeccion nombre="sos" className="w-7 h-7" />
                  </span>
                </div>
                <span className="text-sm font-bold text-red-700 mt-0.5">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-col items-center justify-center flex-1 min-h-[48px] gap-1 transition-colors py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded-md"
            >
              <span className={isActive ? item.activo : "text-gray-500"}>
                <IconoSeccion nombre={item.icono} className="w-7 h-7" />
              </span>
              <span
                className={`text-sm ${
                  isActive
                    ? `font-bold ${item.activo}`
                    : "font-medium text-gray-600"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
