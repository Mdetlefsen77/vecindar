/**
 * Devuelve `value` sólo si es uno de los valores del enum; si no, `undefined`.
 * Los filtros de las listas vienen de la query string sin validar — pasar un
 * valor de enum inválido a Prisma tira `PrismaClientValidationError` → 500.
 * Con esto, un filtro basura simplemente se ignora.
 */
export function enumParam<T extends Record<string, string>>(
  enumObj: T,
  value: string | null | undefined,
): T[keyof T] | undefined {
  if (value == null) return undefined;
  return (Object.values(enumObj) as string[]).includes(value)
    ? (value as T[keyof T])
    : undefined;
}
