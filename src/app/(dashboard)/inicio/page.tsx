import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { getUserId } from "@/lib/api/guard";
import Link from "next/link";
import InvitarVecino from "@/components/crecimiento/InvitarVecino";
import { obtenerOCrearCodigo } from "@/lib/crecimiento/invitaciones";
import { invitacionesConPrimerPago } from "@/lib/crecimiento/beneficiosServer";
import { descuentosDelPeriodo, sumarMeses } from "@/lib/crecimiento/beneficios";
import {
  montoDeSuscripcion,
  periodoActual,
  periodoLabel,
} from "@/lib/cobranza";
import { RONDA_LABEL, TURNOS, fechaParteLabel } from "@/lib/partes";
import { textoPrecioPromo } from "@/lib/oficios";
import { textoVencimiento, tiempoRelativo } from "@/lib/fechas";
import { TIPO_AVISO, avisoVigente } from "@/lib/avisos";
import { promoVigente } from "@/lib/promosServer";
import { esGestor, GESTORES_PANICO } from "@/lib/permisos";
import { ORDEN_INICIO, SECCIONES } from "@/lib/secciones";
import IconoSeccion from "@/components/ui/IconoSeccion";
import type { TipoIncidente } from "@/generated/enums";

// ─── Config ──────────────────────────────────────────────────────────────────

const INCIDENTE_LABEL: Record<TipoIncidente, string> = {
  ROBO: "Robo",
  ROBO_TENTATIVA: "Tentativa de robo",
  SOSPECHOSO: "Movimiento sospechoso",
  VANDALISMO: "Vandalismo",
  OTRO: "Otro",
};

// Contador de "nuevo" en la esquina del botón. Se resetea cuando el usuario
// visita la sección (ver src/lib/vistas.ts).
function NuevoBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-2 -right-2 min-w-[32px] h-[32px] px-2 flex items-center justify-center rounded-full bg-red-600 text-white text-base font-bold border-2 border-white shadow-md">
      {count > 9 ? "9+" : count}
      <span className="sr-only"> nuevos</span>
    </span>
  );
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

type Tono = "alerta" | "activo" | "ok" | "neutro";

const TONO_ESTADO: Record<Tono, string> = {
  alerta: "text-red-700 font-bold",
  activo: "text-amber-800 font-semibold",
  ok: "text-green-700 font-semibold",
  neutro: "text-gray-600",
};

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function InicioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isVecino = session.user.role === "VECINO";
  const nombre = session.user.name?.split(" ")[0] ?? "Vecino";
  const usuarioId = getUserId(session);

  const ahora = new Date();
  const esGestorPanico = esGestor(session.user.role, GESTORES_PANICO);
  const filtroIncidentes = {
    estado: "ACTIVO" as const,
    ...(isVecino ? { visibleVecinos: true } : {}),
  };

  // Primer viaje a la base, todo en paralelo: última visita a cada sección
  // (determina qué cuenta como "nuevo"), el estado de cada acceso, el modo
  // alerta y la invitación.
  const [
    usuarioConVistas,
    ultimoIncidente,
    incidentesActivos,
    pedidosAbiertos,
    mascotasPerdidas,
    codigoInvitacion,
    invitaciones,
    ultimoParte,
    oficiosPublicados,
    promos,
    promosActivas,
    avisos,
    avisosActivos,
    alertaSos,
  ] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        createdAt: true,
        vistasSecciones: true,
        suscripcion: { select: { montoMensual: true, exento: true } },
      },
    }),
    prisma.incidente.findFirst({
      where: filtroIncidentes,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        tipo: true,
        ubicacionText: true,
        createdAt: true,
        lote: {
          select: { numero: true, manzana: { select: { numero: true } } },
        },
      },
    }),
    prisma.incidente.count({ where: filtroIncidentes }),
    prisma.requerimiento.count({
      where: { estado: { in: ["NUEVO", "EN_PROGRESO"] } },
    }),
    prisma.mascotaPerdida.count({ where: { estado: true, tipo: "PERDIDA" } }),
    // Se resuelve acá y no en el cliente: si el cuadro "Invitá a un vecino"
    // aparece después de cargar, empuja el resto de la página (CLS).
    obtenerOCrearCodigo(usuarioId),
    invitacionesConPrimerPago(),
    prisma.parteTurno.findFirst({
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        fecha: true,
        turno: true,
        ronda: true,
        novedades: true,
        imagenes: true,
      },
    }),
    prisma.oficio.count({ where: { estado: "APROBADO" } }),
    // Las que vencen primero arriba: son las que no hay que perderse.
    prisma.promoOficio.findMany({
      where: { ...promoVigente(ahora), oficio: { estado: "APROBADO" } },
      orderBy: { venceAt: "asc" },
      take: 3,
      select: {
        id: true,
        titulo: true,
        precioAntes: true,
        precioAhora: true,
        venceAt: true,
        oficio: { select: { id: true, titulo: true } },
      },
    }),
    prisma.promoOficio.count({
      where: { ...promoVigente(ahora), oficio: { estado: "APROBADO" } },
    }),
    prisma.aviso.findMany({
      where: avisoVigente(ahora),
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, tipo: true, ubicacion: true, detalle: true },
    }),
    prisma.aviso.count({ where: avisoVigente(ahora) }),
    // Modo alerta por SOS: la guardia ve las alertas abiertas de todos; un
    // vecino, solo la suya (las alertas de otros no se difunden).
    prisma.alertaPanico.findFirst({
      where: {
        estado: { not: "CERRADO" },
        ...(esGestorPanico
          ? {}
          : {
              usuarioId,
              createdAt: { gt: new Date(ahora.getTime() - 12 * 3_600_000) },
            }),
      },
      orderBy: { createdAt: "desc" },
      select: { estado: true },
    }),
  ]);
  const vistoAt = (seccion: "INCIDENTES" | "REQUERIMIENTOS" | "MASCOTAS") =>
    usuarioConVistas?.vistasSecciones.find((v) => v.seccion === seccion)
      ?.vistoAt ??
    usuarioConVistas?.createdAt ??
    new Date(0);

  const [nuevosIncidentes, nuevosRequerimientos, nuevasMascotas] =
    await Promise.all([
      prisma.incidente.count({
        where: {
          createdAt: { gt: vistoAt("INCIDENTES") },
          reportadoPorId: { not: usuarioId },
          ...(isVecino ? { visibleVecinos: true } : {}),
        },
      }),
      prisma.requerimiento.count({
        where: {
          createdAt: { gt: vistoAt("REQUERIMIENTOS") },
          usuarioId: { not: usuarioId },
        },
      }),
      prisma.mascotaPerdida.count({
        where: {
          createdAt: { gt: vistoAt("MASCOTAS") },
          usuarioId: { not: usuarioId },
        },
      }),
    ]);

  // Orden por uso (ORDEN_INICIO): lo que cambia todos los días primero.
  const estadoPorSeccion: Record<
    (typeof ORDEN_INICIO)[number],
    { estado: string; tono: Tono; nuevos?: number }
  > = {
    avisos:
      avisosActivos > 0
        ? { estado: plural(avisosActivos, "activo", "activos"), tono: "activo" }
        : { estado: "Sin avisos", tono: "neutro" },
    incidentes:
      incidentesActivos > 0
        ? {
            estado: plural(incidentesActivos, "activo", "activos"),
            tono: "alerta",
            nuevos: nuevosIncidentes,
          }
        : { estado: "✓ Tranquilo", tono: "ok", nuevos: nuevosIncidentes },
    mapa: { estado: "Ver el barrio", tono: "neutro" },
    requerimientos: {
      estado:
        pedidosAbiertos > 0
          ? plural(pedidosAbiertos, "abierto", "abiertos")
          : "Ninguno abierto",
      tono: "neutro",
      nuevos: nuevosRequerimientos,
    },
    mascotas:
      mascotasPerdidas > 0
        ? {
            estado: plural(mascotasPerdidas, "perdida", "perdidas"),
            tono: "activo",
            nuevos: nuevasMascotas,
          }
        : { estado: "Ninguna perdida", tono: "neutro", nuevos: nuevasMascotas },
    oficios:
      promosActivas > 0
        ? {
            estado: `🔥 ${plural(promosActivas, "promo", "promos")}`,
            tono: "activo",
          }
        : {
            estado:
              oficiosPublicados > 0
                ? plural(oficiosPublicados, "servicio", "servicios")
                : "Sumá el tuyo",
            tono: "neutro",
          },
  };
  const accesos = ORDEN_INICIO.map((seccion) => ({
    seccion,
    ...estadoPorSeccion[seccion],
  }));

  // Beneficio por invitar: cuántos invitó, cuántos ya pagaron, y el descuento
  // que ya ganó para este mes o el próximo.
  const misInvitados = invitaciones.filter((i) => i.invitaId === usuarioId);
  const periodoHoy = periodoActual(ahora);
  const miDescuento =
    [periodoHoy, sumarMeses(periodoHoy, 1)]
      .map((periodo) => ({
        mes: periodoLabel(periodo),
        monto: descuentosDelPeriodo(invitaciones, periodo, periodoHoy)
          .filter((d) => d.usuarioId === usuarioId)
          .reduce((t, d) => t + d.monto, 0),
      }))
      .find((d) => d.monto > 0) ?? null;

  return (
    <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 space-y-3 sm:space-y-4 max-w-7xl mx-auto">
      {/* Saludo — visible en tablet+, compacto en mobile */}
      <div className="hidden sm:block">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          ¡Hola, {nombre}!
        </h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
          {new Date().toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* ─── Modo alerta: lo único que va arriba del SOS ───────────── */}
      {alertaSos && (
        <Link
          href="/panico"
          role="alert"
          className="flex items-center gap-3 rounded-2xl bg-red-700 text-white px-4 py-3 min-h-[60px] font-semibold"
        >
          <span aria-hidden="true" className="text-2xl">
            🚨
          </span>
          <span className="flex-1">
            {esGestorPanico
              ? "Hay una alerta SOS sin cerrar"
              : alertaSos.estado === "ENVIADO"
                ? "Tu alerta SOS fue enviada a la guardia"
                : "La guardia recibió tu alerta SOS"}
            <span className="block text-sm font-normal text-red-100">
              {esGestorPanico
                ? "Tocá para atenderla"
                : "Tocá para ver el estado"}
            </span>
          </span>
          <span aria-hidden="true" className="text-2xl">
            ›
          </span>
        </Link>
      )}
      {ultimoIncidente && (
        <Link
          href={
            incidentesActivos === 1
              ? `/incidentes/${ultimoIncidente.id}`
              : "/incidentes"
          }
          role="status"
          className="flex items-center gap-3 rounded-2xl border-2 border-red-300 bg-red-50 text-red-900 px-4 py-3 min-h-[60px]"
        >
          <span aria-hidden="true" className="text-2xl">
            ⚠️
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold">
              {incidentesActivos === 1
                ? `Incidente activo: ${INCIDENTE_LABEL[ultimoIncidente.tipo]}`
                : `${incidentesActivos} incidentes activos en el barrio`}
            </span>
            <span className="block text-sm text-red-800 truncate">
              {incidentesActivos === 1
                ? `${
                    ultimoIncidente.ubicacionText ??
                    (ultimoIncidente.lote
                      ? `Manzana ${ultimoIncidente.lote.manzana.numero}`
                      : "En el barrio")
                  } · ${tiempoRelativo(ultimoIncidente.createdAt)}`
                : "Tocá para ver el detalle"}
            </span>
          </span>
          <span aria-hidden="true" className="text-2xl">
            ›
          </span>
        </Link>
      )}

      {/* ─── SOS: franja de todo el ancho, el único bloque rojo ──────── */}
      <Link
        href="/panico"
        className="flex items-center gap-4 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.99] transition-all text-white px-4 py-4 min-h-[160px] shadow-[0_6px_18px_rgba(220,38,38,0.35)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
      >
        <span className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white/80 flex items-center justify-center flex-shrink-0 text-2xl sm:text-3xl font-black tracking-wider">
          SOS
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[22px] sm:text-2xl font-bold leading-tight whitespace-nowrap">
            Botón de pánico
          </span>
          <span className="block text-base sm:text-lg text-red-50 mt-0.5">
            Pedí ayuda a la guardia al instante
          </span>
        </span>
        <span aria-hidden="true" className="text-4xl leading-none">
          ›
        </span>
      </Link>

      {/* ─── Accesos: 6 iguales, cada uno con cómo está su sección ───── */}
      <nav aria-label="Accesos rápidos">
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {accesos.map((a) => {
            const estilo = SECCIONES[a.seccion];
            return (
              <li key={a.seccion} className="flex">
                <Link
                  href={estilo.href}
                  className="relative flex-1 flex flex-col items-center justify-start gap-2 min-h-[160px] px-2 py-4 text-center bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <NuevoBadge count={a.nuevos ?? 0} />
                  <span
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center ${estilo.chip}`}
                  >
                    <IconoSeccion nombre={a.seccion} className="w-9 h-9" />
                  </span>
                  <span className="text-xl font-bold text-gray-900 leading-tight">
                    {estilo.corto ?? estilo.label}
                  </span>
                  <span
                    className={`text-base leading-tight ${TONO_ESTADO[a.tono]}`}
                  >
                    {a.estado}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Avisos: siempre visible, aunque esté vacío, para que se descubra. */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3">
          <Link
            href="/avisos"
            className="flex items-center gap-2 font-bold text-gray-900 text-base"
          >
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${SECCIONES.avisos.chip}`}
            >
              <IconoSeccion nombre="avisos" className="w-5 h-5" />
            </span>
            Avisos del barrio
          </Link>
          <Link
            href="/avisos/nuevo"
            className="min-h-[44px] inline-flex items-center px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            + Dar un aviso
          </Link>
        </div>
        {avisos.length === 0 ? (
          <p className="px-4 sm:px-5 pb-3 text-sm text-gray-500">
            Sin avisos por ahora. ¿Viste algo que los vecinos tengan que saber?
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            {avisos.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/avisos#aviso-${a.id}`}
                  className="flex items-center gap-3 px-4 sm:px-5 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <span aria-hidden="true" className="text-xl">
                    {TIPO_AVISO[a.tipo].emoji}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-gray-900 truncate">
                      {TIPO_AVISO[a.tipo].label} · {a.ubicacion}
                    </span>
                    {a.detalle && (
                      <span className="block text-sm text-gray-600 truncate">
                        {a.detalle}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <InvitarVecino
        codigo={codigoInvitacion}
        registros={misInvitados.length}
        sumados={misInvitados.filter((i) => i.primerPago).length}
        cuota={
          usuarioConVistas?.suscripcion?.exento
            ? null
            : montoDeSuscripcion(usuarioConVistas?.suscripcion)
        }
        descuento={miDescuento}
      />

      {ultimoParte && (
        <Link
          href={`/partes/${ultimoParte.id}`}
          className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 px-4 sm:px-5 py-3 sm:py-4 hover:bg-gray-50 transition-colors"
        >
          <span aria-hidden="true" className="text-2xl">
            📌
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm text-gray-500">
              Último parte de la guardia
            </span>
            <span className="block font-semibold text-gray-900 truncate">
              Turno {TURNOS[ultimoParte.turno].label.toLowerCase()}
            </span>
            <span className="block text-sm text-gray-600 truncate first-letter:uppercase">
              {fechaParteLabel(ultimoParte.fecha)} · Ronda{" "}
              {RONDA_LABEL[ultimoParte.ronda].toLowerCase()}
              {ultimoParte.imagenes.length > 0 &&
                ` · 📸 ${ultimoParte.imagenes.length}`}
            </span>
          </span>
          <span
            className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
              ultimoParte.novedades
                ? "bg-amber-100 text-amber-800"
                : "bg-green-100 text-green-700"
            }`}
          >
            {ultimoParte.novedades ? "Con novedades" : "Sin novedades"}
          </span>
        </Link>
      )}

      {promos.length > 0 && (
        <section className="bg-orange-50 rounded-2xl border border-orange-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 pt-3">
            <h2 className="font-semibold text-gray-900">
              🔥 Promos del barrio
            </h2>
            <Link
              href="/oficios"
              className="text-sm font-semibold text-orange-700"
            >
              Ver todas
            </Link>
          </div>
          <ul className="divide-y divide-orange-100">
            {promos.map((p) => {
              const precio = textoPrecioPromo(p);
              return (
                <li key={p.id}>
                  <Link
                    href={`/oficios/${p.oficio.id}`}
                    className="block px-4 sm:px-5 py-2.5 hover:bg-orange-100/60 transition-colors"
                  >
                    <span className="block font-medium text-gray-900 truncate">
                      {p.titulo}
                      {precio && (
                        <span className="font-semibold text-orange-800">
                          {" "}
                          · {precio}
                        </span>
                      )}
                    </span>
                    <span className="block text-sm text-gray-600 truncate">
                      {p.oficio.titulo} · {textoVencimiento(p.venceAt)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
