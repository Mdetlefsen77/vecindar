import type { NivelReporte, ReporteModelo } from "./tipos";

/**
 * Filtrado por nivel — CA-03.2: ocurre en el servidor, al construir el
 * modelo, antes de que nada llegue al cliente. Este `ReporteModelo` (versión
 * MVP) ya es agregado puro — no trae nombres, lotes ni ubicaciones exactas
 * en ningún nivel (el "anexo" con detalle identificado por caso, §4.8 de la
 * spec, queda fuera de esta primera versión — ver docs/tasks-reportes.md).
 * Lo único que sí varía por nivel es la sección "Requiere atención": tiene
 * `responsable` (persona) y hace sentido operativo interno, no para afuera.
 */
export function aplicarNivel(
  modelo: ReporteModelo,
  nivel: NivelReporte,
): ReporteModelo {
  if (nivel === "INTERNO") return { ...modelo, nivel };

  const requiereAtencion =
    nivel === "DIFUSION"
      ? { items: [] } // sección operativa, no tiene sentido en un resumen de difusión
      : {
          items: modelo.requiereAtencion.items.map((i) => ({
            ...i,
            responsable: null, // institucional: casos identificados por número, no por nombre
          })),
        };

  return { ...modelo, nivel, requiereAtencion };
}
