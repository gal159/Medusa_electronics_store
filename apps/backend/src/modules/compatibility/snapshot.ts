/**
 * KitSnapshot sudarymas iš Medusa duomenų. Tai vienintelė vieta, kur variklis
 * „liečia“ DB: produktų variantai -> produktas -> (link) component_spec.
 * Variantai be specifikacijos į snapshot'ą nepatenka ir grąžinami atskirai,
 * kad UI galėtų parodyti „šis komponentas dar neaprašytas“.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type {
  ComponentAttributes,
  ComponentSpecSnapshot,
  InterfaceRequirement,
  KitItemSnapshot,
  KitSnapshot,
  McuCapabilities,
  PowerRail,
  SpecCategory,
  VariantAlternative,
} from "./engine/types"

export interface KitItemInput {
  variant_id: string
  quantity: number
  assigned_rail_label?: string | null
}

export interface ResolvedKitItem {
  variant_id: string
  product_id: string
  title: string
  handle: string
  thumbnail: string | null
  quantity: number
  has_spec: boolean
}

export interface KitSnapshotResult {
  snapshot: KitSnapshot
  items: ResolvedKitItem[]
  unknown_variant_ids: string[]
}

type SpecRow = {
  id: string
  category: SpecCategory
  supply_voltage_min_v: number | null
  supply_voltage_max_v: number | null
  logic_voltage_v: number | null
  input_high_min_v: number | null
  is_five_volt_tolerant: boolean
  current_typ_ma: number | null
  current_max_ma: number | null
  datasheet_url: string
  attributes?: ComponentAttributes | null
  interfaces?: Array<{
    type: InterfaceRequirement["type"]
    pin_count: number
    i2c_addresses: number[] | null
    i2c_address_selectable: boolean
  }> | null
  power_rails?: Array<{ label: string; voltage_v: number; max_current_ma: number | null }> | null
  mcu?: {
    digital_pins: number
    analog_inputs: number
    analog_inputs_usable_with_wifi: number | null
    pwm_pins: number
    i2c_buses: number
    spi_buses: number
    uarts: number
    has_wifi: boolean
    io_voltage_v: number
    is_five_volt_tolerant: boolean
  } | null
}

type VariantRow = {
  id: string
  title?: string | null
  metadata?: Record<string, unknown> | null
  product?: {
    id: string
    title: string
    handle: string
    thumbnail: string | null
    component_spec?: SpecRow | null
  } | null
}

export const VARIANT_SNAPSHOT_FIELDS = [
  "id",
  "title",
  "metadata",
  "product.id",
  "product.title",
  "product.handle",
  "product.thumbnail",
  "product.component_spec.*",
  "product.component_spec.interfaces.*",
  "product.component_spec.power_rails.*",
  "product.component_spec.mcu.*",
]

export function toSpecSnapshot(
  spec: SpecRow,
  product: { id: string; title: string; handle: string }
): ComponentSpecSnapshot {
  const interfaces: InterfaceRequirement[] = (spec.interfaces ?? []).map((iface) => ({
    type: iface.type,
    pinCount: iface.pin_count,
    i2cAddresses: iface.i2c_addresses ?? undefined,
    i2cAddressSelectable: iface.i2c_address_selectable,
  }))
  const powerRails: PowerRail[] = (spec.power_rails ?? []).map((rail) => ({
    label: rail.label,
    voltageV: rail.voltage_v,
    maxCurrentMa: rail.max_current_ma,
  }))
  const mcu: McuCapabilities | null = spec.mcu
    ? {
        digitalPins: spec.mcu.digital_pins,
        analogInputs: spec.mcu.analog_inputs,
        analogInputsUsableWithWifi: spec.mcu.analog_inputs_usable_with_wifi,
        pwmPins: spec.mcu.pwm_pins,
        i2cBuses: spec.mcu.i2c_buses,
        spiBuses: spec.mcu.spi_buses,
        uarts: spec.mcu.uarts,
        hasWifi: spec.mcu.has_wifi,
        ioVoltageV: spec.mcu.io_voltage_v,
        isFiveVoltTolerant: spec.mcu.is_five_volt_tolerant,
      }
    : null

  return {
    specId: spec.id,
    productId: product.id,
    productHandle: product.handle,
    title: product.title,
    category: spec.category,
    supplyVoltageMinV: spec.supply_voltage_min_v,
    supplyVoltageMaxV: spec.supply_voltage_max_v,
    logicVoltageV: spec.logic_voltage_v,
    inputHighMinV: spec.input_high_min_v,
    isFiveVoltTolerant: spec.is_five_volt_tolerant,
    currentTypMa: spec.current_typ_ma,
    currentMaxMa: spec.current_max_ma,
    datasheetUrl: spec.datasheet_url,
    interfaces,
    powerRails,
    mcu,
    attributes: spec.attributes ?? null,
  }
}

/**
 * Kiti tos pačios prekės variantai su kita bėgelio srovės riba (pvz.,
 * maitinimo šaltinis 2–20 A), surikiuoti didėjančiai. R4 iš jų parenka
 * mažiausią pakankamą, kai bėgelis perkrautas.
 */
export function collectVariantAlternatives(
  variants: Array<{ id: string; title?: string | null; metadata?: Record<string, unknown> | null } | null> | null | undefined
): VariantAlternative[] {
  return (variants ?? [])
    .flatMap((variant) => {
      const railMaxCurrentMa = variant?.metadata?.rail_max_current_ma
      return variant && typeof railMaxCurrentMa === "number" && railMaxCurrentMa > 0
        ? [{ variantId: variant.id, title: variant.title ?? variant.id, railMaxCurrentMa }]
        : []
    })
    .sort((a, b) => a.railMaxCurrentMa - b.railMaxCurrentMa)
}

/**
 * Varianto lygmens techniniai duomenys. Kai prekės variantai skiriasi
 * parametru (pvz., maitinimo šaltinio srovė 2–10 A), prekės specifikacija jo
 * neturi, o variantas saugo `metadata.rail_max_current_ma`. Grąžinama nauja
 * specifikacija su perrašyta bėgelių srovės riba ir pavadinimu su varianto
 * pavadinimu, kad pranešimai rodytų, apie kurį variantą kalbama.
 */
export function applyVariantOverrides(
  spec: ComponentSpecSnapshot,
  variant: { title?: string | null; metadata?: Record<string, unknown> | null }
): ComponentSpecSnapshot {
  const railMaxCurrentMa = variant.metadata?.rail_max_current_ma
  const hasRailOverride = typeof railMaxCurrentMa === "number" && railMaxCurrentMa > 0
  const showVariantTitle = Boolean(variant.title) && variant.title !== "Standartinis"

  if (!hasRailOverride && !showVariantTitle) {
    return spec
  }

  return {
    ...spec,
    title: showVariantTitle ? `${spec.title} (${variant.title})` : spec.title,
    powerRails: hasRailOverride
      ? spec.powerRails.map((rail) => ({ ...rail, maxCurrentMa: railMaxCurrentMa }))
      : spec.powerRails,
  }
}

/** Vienodi variantai sujungiami sumuojant kiekį, kad R5/R6 skaičiuotų vienetus teisingai. */
function mergeDuplicateVariants(items: KitItemInput[]): KitItemInput[] {
  const merged = new Map<string, KitItemInput>()
  for (const item of items) {
    const existing = merged.get(item.variant_id)
    if (existing) {
      existing.quantity += item.quantity
      existing.assigned_rail_label ??= item.assigned_rail_label
    } else {
      merged.set(item.variant_id, { ...item })
    }
  }
  return [...merged.values()]
}

export async function buildKitSnapshot(
  container: MedusaContainer,
  inputItems: KitItemInput[]
): Promise<KitSnapshotResult> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const items = mergeDuplicateVariants(inputItems).filter((item) => item.quantity > 0)

  if (!items.length) {
    return { snapshot: { items: [] }, items: [], unknown_variant_ids: [] }
  }

  const { data } = await query.graph({
    entity: "product_variant",
    fields: VARIANT_SNAPSHOT_FIELDS,
    filters: { id: items.map((item) => item.variant_id) },
  })
  const variants = data as unknown as VariantRow[]
  const variantById = new Map(variants.map((variant) => [variant.id, variant]))

  // Maitinimo šaltinių kiti variantai (R4 pasiūlymui „pakeisti į …“). Query
  // neseka ryšio variantas → produktas → variantai, todėl atskira užklausa.
  const powerProductIds = [
    ...new Set(
      variants
        .filter((variant) => variant.product?.component_spec?.category === "power")
        .map((variant) => variant.product!.id)
    ),
  ]
  const siblingsByProduct = new Map<string, VariantAlternative[]>()
  if (powerProductIds.length) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "variants.id", "variants.title", "variants.metadata"],
      filters: { id: powerProductIds },
    })
    for (const product of products as unknown as Array<{
      id: string
      variants?: Array<{ id: string; title?: string | null; metadata?: Record<string, unknown> | null } | null> | null
    }>) {
      siblingsByProduct.set(product.id, collectVariantAlternatives(product.variants))
    }
  }

  const snapshotItems: KitItemSnapshot[] = []
  const resolved: ResolvedKitItem[] = []
  const unknown: string[] = []

  for (const item of items) {
    const variant = variantById.get(item.variant_id)
    const product = variant?.product
    if (!variant || !product) {
      unknown.push(item.variant_id)
      continue
    }

    const spec = product.component_spec ?? null
    resolved.push({
      variant_id: variant.id,
      product_id: product.id,
      title: product.title,
      handle: product.handle,
      thumbnail: product.thumbnail,
      quantity: item.quantity,
      has_spec: Boolean(spec),
    })

    if (!spec) {
      continue
    }

    snapshotItems.push({
      itemId: variant.id,
      quantity: item.quantity,
      spec: applyVariantOverrides(toSpecSnapshot(spec, product), variant),
      assignedRailLabel: item.assigned_rail_label ?? undefined,
      variantAlternatives: siblingsByProduct.get(product.id) ?? [],
    })
  }

  return { snapshot: { items: snapshotItems }, items: resolved, unknown_variant_ids: unknown }
}
