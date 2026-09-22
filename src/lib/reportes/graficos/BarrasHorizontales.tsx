import { CATEGORICO_LIGHT, COLOR_TEXTO_SECUNDARIO } from "./colores";

interface Dato {
  label: string;
  valor: number;
  /**
   * Slot fijo en la paleta categórica (0-7), decidido por quien llama a
   * partir de un orden canónico de la entidad (ej. el orden del enum) — no
   * por el orden en que llegan los datos de este período. Así "Robo" es
   * siempre el mismo color en cualquier reporte, no solo dentro de un mismo
   * render (§11: "el color sigue a la entidad, nunca su rango").
   */
  colorSlot: number;
}

/**
 * Composición por categoría — barras horizontales ordenadas por magnitud
 * (§11 regla 3: nada de tortas para más de 2-3 porciones). Más de 8
 * categorías se agrupan en "Otros" (sin color propio, gris).
 */
export default function BarrasHorizontales({ datos }: { datos: Dato[] }) {
  const MAX_CATEGORIAS = 8;
  const visibles =
    datos.length > MAX_CATEGORIAS
      ? [
          ...datos.slice(0, MAX_CATEGORIAS - 1),
          {
            label: "Otros",
            valor: datos
              .slice(MAX_CATEGORIAS - 1)
              .reduce((s, d) => s + d.valor, 0),
            colorSlot: -1,
          },
        ]
      : datos;

  const ordenadas = [...visibles].sort((a, b) => b.valor - a.valor);
  const max = Math.max(1, ...ordenadas.map((d) => d.valor));

  if (ordenadas.every((d) => d.valor === 0)) {
    return <p className="text-sm text-gray-400 py-2">Sin datos en el período.</p>;
  }

  return (
    <div className="space-y-2" role="img" aria-label="Gráfico de barras horizontales">
      {ordenadas.map((d) => {
        const color =
          d.colorSlot >= 0
            ? CATEGORICO_LIGHT[d.colorSlot % CATEGORICO_LIGHT.length]
            : "#9ca3af"; // "Otros" — gris, sin identidad propia
        const pct = Math.max(2, (d.valor / max) * 100);
        return (
          <div key={d.label} className="flex items-center gap-2 text-sm">
            <span className="w-28 shrink-0 truncate text-gray-700">{d.label}</span>
            <div className="flex-1 h-5 bg-gray-50 rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span
              className="w-8 shrink-0 text-right font-medium"
              style={{ color: COLOR_TEXTO_SECUNDARIO }}
            >
              {d.valor}
            </span>
          </div>
        );
      })}
    </div>
  );
}
