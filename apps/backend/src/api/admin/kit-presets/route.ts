import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { KIT_PRESETS } from "../../../lib/kit-presets"

/** GET /admin/kit-presets: šablonų peržiūra admin'e (redaguojami kode). */
export async function GET(_req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.json({ presets: KIT_PRESETS, count: KIT_PRESETS.length })
}
