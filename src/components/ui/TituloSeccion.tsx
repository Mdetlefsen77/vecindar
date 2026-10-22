import IconoSeccion from "@/components/ui/IconoSeccion";
import { SECCIONES, type Seccion } from "@/lib/secciones";

/** Título de una sección con su ícono y su color: el mismo que en Inicio. */
export default function TituloSeccion({
  seccion,
  children,
}: {
  seccion: Seccion;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${SECCIONES[seccion].chip}`}
      >
        <IconoSeccion nombre={seccion} />
      </span>
      <h1 className="text-2xl font-bold text-gray-900">{children}</h1>
    </div>
  );
}
