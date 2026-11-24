import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { addToCartWorkflow } from "@medusajs/medusa/core-flows"
import { KIT_MODULE } from "../../modules/kit"
import type KitModuleService from "../../modules/kit/service"
import { validateKitWorkflow } from "../validate-kit"

export type AddKitToCartWorkflowInput = {
  kit_id: string
  cart_id: string
}

type KitRow = {
  id: string
  name: string
  items: Array<{ variant_id: string; quantity: number; assigned_rail_label: string | null }>
}

export const retrieveKitStep = createStep("retrieve-kit", async (kitId: string, { container }) => {
  const service = container.resolve<KitModuleService>(KIT_MODULE)
  const kit = (await service.retrieveKit(kitId, { relations: ["items"] })) as KitRow
  if (!kit.items.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Rinkinys tuščias")
  }
  return new StepResponse(kit)
})

/** Įrašo paskutinę patikrą; kompensacija grąžina ankstesnę reikšmę. */
export const recordKitValidationStep = createStep(
  "record-kit-validation",
  async (
    input: { kit_id: string; report: Record<string, unknown>; isOrderable: boolean },
    { container }
  ) => {
    const service = container.resolve<KitModuleService>(KIT_MODULE)
    const previous = await service.retrieveKit(input.kit_id)
    await service.updateKits({
      id: input.kit_id,
      last_validation: input.report,
      status: input.isOrderable ? "validated" : "draft",
    })
    return new StepResponse(null, {
      id: previous.id,
      last_validation: previous.last_validation,
      status: previous.status,
    })
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }
    const service = container.resolve<KitModuleService>(KIT_MODULE)
    await service.updateKits(previous)
  }
)

/**
 * Rinkinys į krepšelį: pakartotinė patikra (specifikacijos galėjo pasikeisti),
 * tada kiekviena eilutė pridedama su `metadata.kit_id`, pagal kurį 4 etape
 * complete-cart hook'as atpažins rinkinį ir blokuos užsakymą su klaidomis.
 * Rinkinys su klaidomis į krepšelį dedamas (naudotojas gali jį taisyti), bet
 * atsakyme grąžinama ataskaita.
 */
export const addKitToCartWorkflow = createWorkflow(
  "add-kit-to-cart",
  (input: AddKitToCartWorkflowInput) => {
    const kit = retrieveKitStep(input.kit_id)

    const validation = validateKitWorkflow.runAsStep({
      input: transform({ kit }, ({ kit }) => ({
        items: kit.items.map((item) => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
          assigned_rail_label: item.assigned_rail_label,
        })),
      })),
    })

    recordKitValidationStep(
      transform({ input, validation }, ({ input, validation }) => ({
        kit_id: input.kit_id,
        report: validation.report as unknown as Record<string, unknown>,
        isOrderable: validation.report.isOrderable,
      }))
    )

    addToCartWorkflow.runAsStep({
      input: transform({ input, kit }, ({ input, kit }) => ({
        cart_id: input.cart_id,
        items: kit.items.map((item) => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
          metadata: { kit_id: kit.id, kit_name: kit.name },
        })),
      })),
    })

    return new WorkflowResponse({ kit, validation })
  }
)
