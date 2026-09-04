import type { Rol } from "@/generated/enums";

/**
 * Matriz central de permisos: qué roles pueden *gestionar* (cambiar estado,
 * prioridad, visibilidad, etc.) cada módulo. Antes cada route handler repetía
 * `role === "ADMIN" || role === "SEGURIDAD"` a mano y las listas divergían entre
 * módulos sin que quedara claro si era intencional. Ahora está en un solo lugar.
 *
 * Las diferencias entre módulos son a propósito:
 *  - Incidentes son competencia de seguridad → ADMIN + SEGURIDAD.
 *  - Requerimientos son mantenimiento del barrio → además REFERENTE_MANZANA.
 *  - Mascotas son comunitarias → ADMIN + REFERENTE_MANZANA (seguridad no interviene).
 *  - Usuarios / configuración → solo ADMIN.
 */
export const GESTORES_INCIDENTES: readonly Rol[] = ["ADMIN", "SEGURIDAD"];

export const GESTORES_REQUERIMIENTOS: readonly Rol[] = [
  "ADMIN",
  "SEGURIDAD",
  "REFERENTE_MANZANA",
];

export const GESTORES_MASCOTAS: readonly Rol[] = ["ADMIN", "REFERENTE_MANZANA"];

/** Reciben el panel de recepción de alertas SOS y pueden avanzar su estado. */
export const GESTORES_PANICO: readonly Rol[] = ["ADMIN", "SEGURIDAD"];

/** Acceso al panel de administración y gestión de usuarios / configuración. */
export const GESTORES_USUARIOS: readonly Rol[] = ["ADMIN"];

/** Gestionan cobranza (panel `/admin/cobranza` y su API) sin ser ADMIN completo. */
export const GESTORES_COBRANZA: readonly Rol[] = ["ADMIN", "TESORERO"];

/** `true` si el rol de la sesión está dentro del conjunto permitido. */
export function esGestor(
  rol: string | undefined | null,
  permitidos: readonly Rol[],
): boolean {
  return !!rol && (permitidos as readonly string[]).includes(rol);
}
