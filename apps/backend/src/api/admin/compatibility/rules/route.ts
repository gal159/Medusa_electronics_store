import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ALL_RULES } from "../../../../modules/compatibility/engine"

/**
 * GET /admin/compatibility/rules: registruotų taisyklių sąrašas admin'ui.
 * Taisyklės yra kode (ne DB), todėl sąrašas visada atitinka tai, ką vykdo variklis.
 */
export async function GET(_req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.json({
    rules: ALL_RULES.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
    })),
    count: ALL_RULES.length,
  })
}
