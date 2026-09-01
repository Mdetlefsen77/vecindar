/**
 * Nombre para mostrar: "Nombre Apellido". Tolera `apellido` vacío/ausente
 * (filas viejas anteriores a la migración `add_apellido_usuario`).
 */
export function nombreCompleto(u: {
  nombre: string;
  apellido?: string | null;
}): string {
  return u.apellido ? `${u.nombre} ${u.apellido}` : u.nombre;
}
