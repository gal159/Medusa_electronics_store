import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { addKitToCartWorkflow } from "../../../../../workflows/kit/add-kit-to-cart"
import type { AddKitToCartBody } from "../../validators"

/** POST /store/kits/:id/add-to-cart: rinkinio eilutės į krepšelį su metadata.kit_id. */
export async function POST(req: MedusaRequest<AddKitToCartBody>, res: MedusaResponse) {
  const { result } = await addKitToCartWorkflow(req.scope).run({
    input: { kit_id: req.params.id, cart_id: req.validatedBody.cart_id },
  })

  res.json({ kit: result.kit, validation: result.validation })
}
