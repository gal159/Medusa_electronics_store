/**
 * Konfigūratoriaus tipai. Atspindi backend'o `ValidationReport`
 * (apps/backend/src/modules/compatibility/engine/types.ts) ir
 * `POST /store/kits/validate` atsakymą.
 */
export type Severity = "error" | "warning" | "info"

export type RuleResult = {
  ruleId: string
  severity: Severity
  message: string
  explanation: string
  involvedItemIds: string[]
  suggestion?: {
    text: string
    productHandle?: string
    /**
     * Rinkinio eilutė (variant id), kurią siūloma pakeisti: kitu variantu
     * (`replaceWithVariantId`) arba kita preke (`productHandle`).
     */
    replaceItemId?: string
    replaceWithVariantId?: string
  }
  source?: string
}

export type ValidationReport = {
  results: RuleResult[]
  summary: { errors: number; warnings: number; infos: number }
  isOrderable: boolean
  evaluatedRuleIds: string[]
}

export type ResolvedKitItem = {
  variant_id: string
  product_id: string
  title: string
  handle: string
  thumbnail: string | null
  quantity: number
  has_spec: boolean
}

export type ValidateKitResponse = {
  report: ValidationReport
  items: ResolvedKitItem[]
  unknown_variant_ids: string[]
  unspecified_variant_ids: string[]
}

export type KitItemInput = {
  variant_id: string
  quantity: number
  assigned_rail_label?: string | null
}

/**
 * Konfigūratoriui pakankamas vaizdas. Vienas įrašas vienam variantui;
 * kelių variantų prekės (pvz., maitinimo šaltinis 2–10 A) turi tą patį `id`.
 */
export type ConfiguratorProduct = {
  /** Prekės id (bendras visiems tos prekės variantams). */
  id: string
  title: string
  handle: string
  subtitle: string | null
  thumbnail: string | null
  variantId: string
  /** Varianto pavadinimas (pvz., „5 A“), kai prekė turi kelis variantus; kitaip null. */
  variantTitle: string | null
  priceAmount: number | null
  currencyCode: string
  categoryIds: string[]
}

/** Rinkinio šablonas (atitinka backend'o src/lib/kit-presets.ts). */
export type KitPresetSlot = {
  key: string
  label: string
  allowedHandles: string[]
  default?: { handle: string; variantTitle?: string; quantity?: number }
  optional?: boolean
  multiple?: boolean
  quantity?: { label: string; min: number; max: number }
  hint?: string
}

export type KitPreset = {
  id: string
  name: string
  description: string
  slots: KitPresetSlot[]
}

/** Pavadinimas su variantu, pvz. „LED maitinimo šaltinis 5 V (5 A)“. */
export function displayTitle(product: Pick<ConfiguratorProduct, "title" | "variantTitle">): string {
  return product.variantTitle ? `${product.title} (${product.variantTitle})` : product.title
}

export type ConfiguratorCategory = {
  id: string
  name: string
  handle: string
  description: string | null
  specCategory: string | null
}
