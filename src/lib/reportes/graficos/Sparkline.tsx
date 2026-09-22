import { COLOR_SERIE_PRINCIPAL } from "./colores";

/**
 * Microtendencia de 12 meses para un KPI del resumen ejecutivo (§7.6/12.7:
 * "más importante con volumen bajo, no menos" — distingue un pico aislado de
 * una curva real). SVG puro, tamaño fijo — nada de `ResponsiveContainer`
 * (ver docs/proposal-reportes.md §4, riesgo de impresión de esa API).
 */
export default function Sparkline({
  valores,
  ancho = 100,
  alto = 28,
}: {
  valores: number[];
  ancho?: number;
  alto?: number;
}) {
  if (valores.length < 2 || valores.every((v) => v === 0)) {
    return <div style={{ width: ancho, height: alto }} aria-hidden="true" />;
  }

  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const rango = max - min || 1;
  const paso = ancho / (valores.length - 1);

  const puntos = valores.map((v, i) => {
    const x = i * paso;
    const y = alto - ((v - min) / rango) * (alto - 4) - 2;
    return [x, y] as const;
  });

  const path = puntos
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const [ultimoX, ultimoY] = puntos[puntos.length - 1]!;

  return (
    <svg
      width={ancho}
      height={alto}
      viewBox={`0 0 ${ancho} ${alto}`}
      role="img"
      aria-label={`Tendencia de los últimos ${valores.length} meses`}
    >
      <path
        d={path}
        fill="none"
        stroke={COLOR_SERIE_PRINCIPAL}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={ultimoX} cy={ultimoY} r={2.5} fill={COLOR_SERIE_PRINCIPAL} />
    </svg>
  );
}
