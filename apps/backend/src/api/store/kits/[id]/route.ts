import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { KIT_MODULE } from "../../../../modules/kit"
import type KitModuleService from "../../../../modules/kit/service"

/** GET /store/kits/:id: rinkinys su eilutėmis ir paskutine patikra. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<KitModuleService>(KIT_MODULE)

  const kit = await service.retrieveKit(req.params.id, { relations: ["items"] }).catch(() => null)
  if (!kit) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Rinkinys ${req.params.id} nerastas`)
  }

  res.json({ kit })
}
