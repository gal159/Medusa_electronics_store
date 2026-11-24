import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { validateKitWorkflow } from "../../../../workflows/validate-kit"
import type { ValidateKitBody } from "../validators"

/**
 * POST /store/kits/validate
 * Įvestis: komponentų variantų sąrašas su kiekiais. Išvestis: patikros
 * ataskaita (rezultatai su paaiškinimais ir pasiūlymais), išspręsti
 * komponentai ir variantai, kurių neįvertinome (nerasti arba be specifikacijos).
 * Nieko neišsaugo, todėl tinka gyvai patikrai konfigūratoriuje.
 */
export async function POST(req: MedusaRequest<ValidateKitBody>, res: MedusaResponse) {
  const { result } = await validateKitWorkflow(req.scope).run({
    input: { items: req.validatedBody.items },
  })

  res.json(result)
}
