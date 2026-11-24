/**
 * NFR-1 matavimas: patikros trukmė 20 komponentų rinkiniui.
 *
 *   npx medusa exec ./src/scripts/measure-validation.ts
 *
 * Matuojamas visas `validate-kit` workflow (DB užklausa + variklis), kaip jį
 * kviečia `POST /store/kits/validate`, be HTTP sluoksnio. Po 3 apšilimo
 * paleidimų atliekama 30 matavimų; spausdinama mediana, p95 ir maksimumas.
 * Kriterijus (NFR-1): mediana < 300 ms.
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { performance } from "node:perf_hooks"
import { evaluateKit } from "../modules/compatibility/engine"
import { buildKitSnapshot } from "../modules/compatibility/snapshot"
import { validateKitWorkflow } from "../workflows/validate-kit"

const WARMUP_RUNS = 3
const MEASURED_RUNS = 30
const KIT_SIZE = 20
const THRESHOLD_MS = 300

/** 20 skirtingų komponentų iš katalogo (tipiškas didelis rinkinys). */
const KIT_HANDLES = [
  "esp32-devkit-v1",
  "bme280-modulis-3v3",
  "dht22-am2302",
  "hc-sr04",
  "mpu-6050-gy-521",
  "bh1750",
  "ds18b20-waterproof",
  "ssd1306-oled-0-96",
  "lcd-1602-i2c",
  "sg90-servo",
  "28byj-48-uln2003",
  "reles-modulis-1-kanalo",
  "ws2812b-juosta-1m",
  "mb102-breadboard-maitinimas",
  "hc-05-bluetooth",
  "nrf24l01-plus",
  "rezistoriu-rinkinys-600",
  "breadboard-830",
  "jumper-laidai-120",
  "lygiu-keitiklis-bss138-4ch",
]

function percentile(sorted: number[], p: number): number {
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, index)]
}

async function measure(fn: () => Promise<unknown>): Promise<number[]> {
  for (let run = 0; run < WARMUP_RUNS; run++) {
    await fn()
  }
  const durations: number[] = []
  for (let run = 0; run < MEASURED_RUNS; run++) {
    const start = performance.now()
    await fn()
    durations.push(performance.now() - start)
  }
  return durations.sort((a, b) => a - b)
}

function summarize(label: string, sorted: number[]): string {
  const fmt = (value: number) => `${value.toFixed(1)} ms`
  return `${label}: mediana ${fmt(percentile(sorted, 50))}, p95 ${fmt(percentile(sorted, 95))}, max ${fmt(sorted[sorted.length - 1])}`
}

export default async function measureValidation({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product.handle"],
    filters: { product: { handle: KIT_HANDLES } },
  })
  const items = variants.map((variant) => ({ variant_id: variant.id, quantity: 1 }))
  if (items.length !== KIT_SIZE) {
    logger.warn(`Rasta ${items.length} iš ${KIT_SIZE} komponentų; paleiskite seed skriptus.`)
  }

  const { snapshot } = await buildKitSnapshot(container, items)

  const workflowTimes = await measure(() => validateKitWorkflow(container).run({ input: { items } }))
  const snapshotTimes = await measure(() => buildKitSnapshot(container, items))
  const engineTimes = await measure(async () => evaluateKit(snapshot))

  const median = percentile(workflowTimes, 50)
  logger.info(`NFR-1 (${items.length} komponentų, ${MEASURED_RUNS} matavimų po ${WARMUP_RUNS} apšilimo)`)
  logger.info(summarize("  validate-kit workflow", workflowTimes))
  logger.info(summarize("  iš jo snapshot (DB)  ", snapshotTimes))
  logger.info(summarize("  iš jo variklis R1–R8 ", engineTimes))
  logger.info(
    `  Kriterijus mediana < ${THRESHOLD_MS} ms: ${median < THRESHOLD_MS ? "ATITINKA" : "NEATITINKA"}`
  )
}
