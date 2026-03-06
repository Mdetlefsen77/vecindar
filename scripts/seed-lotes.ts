/**
 * scripts/seed-lotes.ts
 *
 * Pobla la tabla `manzanas` y `lotes` usando la configuración del plano catastral.
 * Usa upsert — es seguro correr múltiples veces sin duplicar datos.
 *
 * Uso:
 *   npx tsx scripts/seed-lotes.ts
 *   npx tsx scripts/seed-lotes.ts --reset   ← borra lotes/manzanas antes de sembrar
 */

import 'dotenv/config'
import { prisma } from '../lib/prisma/client'
import { MANZANAS_CONFIG } from '../lib/barrio/manzanas'
import { calcularLotesPolygons } from '../lib/barrio/lotes'

const RESET = process.argv.includes('--reset')

// Área aproximada de cada lote en m²
// bounds[0]=NW, bounds[1]=NE, bounds[3]=SW
function calcularArea(bounds: [number, number][]): number {
    const [NW, NE, , SW] = bounds
    const latMid = (NW[0] + SW[0]) / 2
    const heightM = Math.abs(NW[0] - SW[0]) * 111320
    const widthM = Math.abs(NE[1] - NW[1]) * 111320 * Math.cos((latMid * Math.PI) / 180)
    return Math.round(heightM * widthM * 100) / 100
}

async function main() {
    console.log('🚀 Seed de manzanas y lotes\n')

    if (RESET) {
        console.log('⚠️  --reset: eliminando datos existentes en orden seguro...')
        // Orden de eliminación respetando FK
        await prisma.comentarioReq.deleteMany()
        await prisma.requerimiento.deleteMany()
        await prisma.mascotaPerdida.deleteMany()
        await prisma.alertaPanico.deleteMany()
        await prisma.incidente.deleteMany()
        await prisma.usuario.deleteMany()
        await prisma.residente.deleteMany()
        await prisma.lote.deleteMany()
        await prisma.manzana.deleteMany()
        console.log('✅ Tablas limpiadas\n')
    }

    // ── 1. Manzanas ─────────────────────────────────────────────────────────
    const manzanasConfig = MANZANAS_CONFIG.filter((m) => m.tipo === 'manzana')

    console.log(`📦 Upsert de ${manzanasConfig.length} manzanas reales...`)

    for (const cfg of manzanasConfig) {
        await prisma.manzana.upsert({
            where: { id: cfg.id },
            create: {
                id: cfg.id,
                numero: cfg.numero,
                zona: cfg.zona,
            },
            update: {
                numero: cfg.numero,
                zona: cfg.zona,
            },
        })
    }

    // Resetear la secuencia de autoincrement para evitar conflictos futuros
    const maxId = Math.max(...manzanasConfig.map((m) => m.id))
    await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"manzanas"', 'id'), ${maxId}, true)`
    )

    console.log(`✅ Manzanas ok (secuencia reseteada a ${maxId})\n`)

    // ── 2. Lotes ─────────────────────────────────────────────────────────────
    let totalCreados = 0
    let totalActualizados = 0

    for (const cfg of manzanasConfig) {
        const lotes = calcularLotesPolygons(cfg)
        if (!lotes.length) continue

        process.stdout.write(`  MZ ${cfg.numero.padStart(2)} (${lotes.length} lotes)... `)

        for (const lote of lotes) {
            const area = calcularArea(lote.bounds)

            const result = await prisma.lote.upsert({
                where: {
                    manzanaId_numero: {
                        manzanaId: cfg.id,
                        numero: lote.numero,
                    },
                },
                create: {
                    manzanaId: cfg.id,
                    numero: lote.numero,
                    calleFrente: 'CALLE PÚBLICA', // se puede refinar por manzana después
                    habitado: false,
                    latitud: lote.centro[0],
                    longitud: lote.centro[1],
                    area,
                },
                update: {
                    // Actualiza coordenadas y área si el layout cambió,
                    // pero NO toca habitado ni calleFrente para no pisar datos reales
                    latitud: lote.centro[0],
                    longitud: lote.centro[1],
                    area,
                },
            })

            // Prisma upsert no indica si fue create o update; usamos id para diferenciarlo
            if (result.createdAt.getTime() === result.updatedAt.getTime()) {
                totalCreados++
            } else {
                totalActualizados++
            }
        }

        console.log('✅')
    }

    console.log(`\n🎉 Seed completado:`)
    console.log(`   Lotes creados:      ${totalCreados}`)
    console.log(`   Lotes actualizados: ${totalActualizados}`)
    console.log(`   Total:              ${totalCreados + totalActualizados}`)
}

main()
    .catch((e) => {
        console.error('\n❌ Error:', e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
