import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { validateKitWorkflow } from "../../../../workflows/validate-kit"
import type { ValidateKitBody } from "../../../store/kits/validators"

/**
 * POST /admin/compatibility/validate: ta pati patikra kaip storefront'e,
 * administratoriui tikrinant naujai įvestas specifikacijas.
 */
export async function POST(req: AuthenticatedMedusaRequest<ValidateKitBody>, res: MedusaResponse) {
  const { result } = await validateKitWorkflow(req.scope).run({
    input: { items: req.validatedBody.items },
  })
  res.json(result)
}
