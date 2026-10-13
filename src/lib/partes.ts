import type {
  EstadoRonda,
  NivelCirculacion,
  TurnoGuardia,
} from "@/generated/enums";

// Partes de turno de la guardia. Sin imports de servidor: lo usan tanto el
// formulario (cliente) como las páginas y la API.

/** Zona horaria del barrio: la sugerencia de turno no puede depender del reloj UTC del servidor. */
const ZONA_HORARIA = "America/Argentina/Cordoba";

/** Horarios de cada turno de la guardia (hora local, `fin` exclusivo). */
export const TURNOS: Record<
  TurnoGuardia,
  { label: string; inicio: number; fin: number; recomendacion: string }
> = {
  MANANA: {
    label: "Mañana",
    inicio: 5,
    fin: 8,
    recomendacion:
      "Al salir, verifiquen que portones y vehículos queden bien cerrados",
  },
  MEDIODIA: {
    label: "Mediodía",
    inicio: 12,
    fin: 13,
    recomendacion:
      "No dejen puertas ni portones abiertos aunque estén en casa",
  },
  MEDIATARDE: {
    label: "Media tarde",
    inicio: 17,
    fin: 18,
    recomendacion:
      "Atentos a personas o vehículos desconocidos recorriendo el barrio",
  },
  NOCHE: {
    label: "Noche",
    inicio: 20,
    fin: 23,
    recomendacion: "Tomen recaudos para poder descansar tranquilos",
  },
};

export const ORDEN_TURNOS: TurnoGuardia[] = [
  "MANANA",
  "MEDIODIA",
  "MEDIATARDE",
  "NOCHE",
];

export const RONDA_LABEL: Record<EstadoRonda, string> = {
  FINALIZADA: "Finalizada",
  PARCIAL: "Parcial",
  NO_REALIZADA: "No realizada",
};

export const CIRCULACION_LABEL: Record<NivelCirculacion, string> = {
  ESCASA: "Escasa",
  NORMAL: "Normal",
  INTENSA: "Intensa",
};

export function horarioTurno(turno: TurnoGuardia): string {
  const t = TURNOS[turno];
  const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return `${hh(t.inicio)} a ${hh(t.fin)}`;
}

/** Fecha ("YYYY-MM-DD") y hora local del barrio para un instante dado. */
function enZonaHoraria(ahora: Date): { fecha: string; hora: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(ahora);
  const v = (t: string) => partes.find((p) => p.type === t)!.value;
  return { fecha: `${v("year")}-${v("month")}-${v("day")}`, hora: Number(v("hour")) };
}

/** "YYYY-MM-DD" del día anterior. */
function diaAnterior(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Turno que la guardia probablemente está cerrando: el último que ya empezó.
 * Entre las 0 y las 5 todavía corresponde al turno noche del día anterior.
 */
export function turnoSugerido(ahora = new Date()): {
  fecha: string;
  turno: TurnoGuardia;
} {
  const { fecha, hora } = enZonaHoraria(ahora);
  const empezados = ORDEN_TURNOS.filter((t) => TURNOS[t].inicio <= hora);
  if (empezados.length === 0) {
    return { fecha: diaAnterior(fecha), turno: "NOCHE" };
  }
  return { fecha, turno: empezados[empezados.length - 1] };
}

/** "lunes 13/10" — `fecha` es un DATE de la base (medianoche UTC) o "YYYY-MM-DD". */
export function fechaParteLabel(fecha: Date | string): string {
  const d =
    typeof fecha === "string" ? new Date(`${fecha}T00:00:00Z`) : fecha;
  // Armada a mano: el separador de `toLocaleDateString` cambia según el
  // motor (Node da "13-10", los navegadores "13/10").
  const diaSemana = d.toLocaleDateString("es-AR", {
    timeZone: "UTC",
    weekday: "long",
  });
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${diaSemana} ${dd}/${mm}`;
}

export interface DatosMensajeParte {
  fecha: Date | string;
  turno: TurnoGuardia;
  ronda: EstadoRonda;
  circulacion: NivelCirculacion;
  presenciaPolicial: boolean;
  recomendacion: string;
  novedades: string | null;
  cantidadFotos: number;
}

/**
 * Mensaje para el grupo de WhatsApp, con el mismo formato que la guardia
 * usaba a mano. `link` (opcional) lleva al parte en la app.
 */
export function mensajeParte(p: DatosMensajeParte, link?: string): string {
  const lineas = [
    `📌 TURNO ${TURNOS[p.turno].label.toUpperCase()} · ${fechaParteLabel(p.fecha)}`,
    "",
    `⭕ Ronda de patrullaje: ${RONDA_LABEL[p.ronda]}`,
    `🛵🚲🚘 Circulación barrial: ${CIRCULACION_LABEL[p.circulacion]}`,
    `👮🏻 Presencia policial: ${p.presenciaPolicial ? "Sí" : "No"}`,
  ];
  if (p.recomendacion.trim()) lineas.push(`⚠️ _${p.recomendacion.trim()}_`);
  lineas.push(
    "📞 Ante cualquier sospecha o alerta, llamen al 911 y publiquen en el grupo",
    "",
  );
  if (p.novedades?.trim()) {
    lineas.push("📝 *NOVEDADES*", p.novedades.trim());
  } else {
    lineas.push("📝 SIN NOVEDADES");
  }
  if (link) {
    lineas.push(
      "",
      p.cantidadFotos > 0
        ? `📸 Fotos y detalle en Vecindar 👉 ${link}`
        : `Ver en Vecindar 👉 ${link}`,
    );
  }
  return lineas.join("\n");
}

/** Horas después del fin de un turno durante las que todavía se reclama su parte. */
const VENTANA_RECORDATORIO_HS = 3;

/**
 * Turno que terminó hace menos de `VENTANA_RECORDATORIO_HS` horas, para el
 * recordatorio a la guardia si no cargó el parte. La ventana es amplia porque
 * el cron de GitHub Actions puede correr con demora. Los turnos terminan a las
 * 8, 13, 18 y 23, así que las ventanas no se pisan; la del turno noche cruza
 * la medianoche y en ese caso el parte es del día anterior.
 */
export function turnoRecienTerminado(
  ahora = new Date(),
): { fecha: string; turno: TurnoGuardia } | null {
  const { fecha, hora } = enZonaHoraria(ahora);
  for (const turno of ORDEN_TURNOS) {
    const desdeFin = (hora - TURNOS[turno].fin + 24) % 24;
    if (desdeFin < VENTANA_RECORDATORIO_HS) {
      const cruzoMedianoche = hora < TURNOS[turno].fin;
      return { fecha: cruzoMedianoche ? diaAnterior(fecha) : fecha, turno };
    }
  }
  return null;
}
