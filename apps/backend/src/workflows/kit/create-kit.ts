import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { KIT_MODULE } from "../../modules/kit"
import type KitModuleService from "../../modules/kit/service"
import type { KitItemInput } from "../../modules/compatibility/snapshot"
import { validateKitWorkflow, type ValidateKitWorkflowOutput } from "../validate-kit"

export type CreateKitWorkflowInput = {
  name: string
  customer_id?: string | null
  items: KitItemInput[]
}

type CreateKitStepInput = {
  name: string
  customer_id: string | null
  validation: ValidateKitWorkflowOutput
}

/**
 * Išsaugo rinkinį su eilutėmis. Eilutės imamos iš patikros rezultato
 * (`validation.items`), todėl nerasti variantai į rinkinį nepatenka.
 */
export const createKitStep = createStep(
  "create-kit",
  async (input: CreateKitStepInput, { container }) => {
    const service = container.resolve<KitModuleService>(KIT_MODULE)
    const { validation } = input

    const kit = await service.createKits({
      name: input.name,
      customer_id: input.customer_id,
      status: validation.report.isOrderable ? "validated" : "draft",
      last_validation: validation.report as unknown as Record<string, unknown>,
    })

    await service.createKitItems(
      validation.items.map((item) => ({
        kit_id: kit.id,
        variant_id: item.variant_id,
        product_id: item.product_id,
        quantity: item.quantity,
      }))
    )

    return new StepResponse(kit, kit.id)
  },
  async (kitId, { container }) => {
    if (!kitId) {
      return
    }
    const service = container.resolve<KitModuleService>(KIT_MODULE)
    await service.deleteKits(kitId)
  }
)

/** Patikrina ir išsaugo rinkinį vienu veiksmu; patikra yra įdėtas workflow. */
export const createKitWorkflow = createWorkflow("create-kit", (input: CreateKitWorkflowInput) => {
  const validation = validateKitWorkflow.runAsStep({
    input: { items: input.items },
  })

  const stepInput = transform({ input, validation }, ({ input, validation }) => ({
    name: input.name,
    customer_id: input.customer_id ?? null,
    validation,
  }))

  const kit = createKitStep(stepInput)

  return new WorkflowResponse({ kit, validation })
})
