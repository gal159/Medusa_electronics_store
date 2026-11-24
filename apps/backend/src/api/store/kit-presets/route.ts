import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { KIT_PRESETS } from "../../../lib/kit-presets"

/**
 * GET /store/kit-presets: rinkinių šablonai konfigūratoriui. Grąžinami
 * prekių handle'ai; storefront'as juos susieja su jau turimais katalogo
 * duomenimis (variantais, kainomis).
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.json({ presets: KIT_PRESETS, count: KIT_PRESETS.length })
}
