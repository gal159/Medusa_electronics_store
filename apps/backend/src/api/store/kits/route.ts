import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createKitWorkflow } from "../../../workflows/kit/create-kit"
import type { CreateKitBody } from "./validators"

/**
 * POST /store/kits: patikrina ir išsaugo rinkinį. Prisijungusiam pirkėjui
 * įrašomas `customer_id` iš auth konteksto; svečiui rinkinys anoniminis.
 */
export async function POST(req: MedusaRequest<CreateKitBody>, res: MedusaResponse) {
  const authContext = (req as MedusaRequest & { auth_context?: { actor_type?: string; actor_id?: string } })
    .auth_context
  const customerId = authContext?.actor_type === "customer" ? authContext.actor_id ?? null : null

  const { result } = await createKitWorkflow(req.scope).run({
    input: {
      name: req.validatedBody.name,
      customer_id: customerId,
      items: req.validatedBody.items,
    },
  })

  res.status(201).json({ kit: result.kit, validation: result.validation })
}
