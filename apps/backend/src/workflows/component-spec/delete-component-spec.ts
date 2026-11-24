import { Modules } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { dismissRemoteLinkStep } from "@medusajs/medusa/core-flows"
import { COMPONENT_SPEC_MODULE } from "../../modules/component-spec"
import type ComponentSpecModuleService from "../../modules/component-spec/service"

type DeleteComponentSpecWorkflowInput = {
  id: string
  product_id: string
}

export const deleteComponentSpecStep = createStep(
  "delete-component-spec",
  async (id: string, { container }) => {
    const service = container.resolve<ComponentSpecModuleService>(COMPONENT_SPEC_MODULE)
    // Soft delete: įrašas lieka DB su deleted_at, todėl kompensacija jį atkuria.
    await service.softDeleteComponentSpecs(id)
    return new StepResponse(id, id)
  },
  async (id, { container }) => {
    if (!id) {
      return
    }
    const service = container.resolve<ComponentSpecModuleService>(COMPONENT_SPEC_MODULE)
    await service.restoreComponentSpecs(id)
  }
)

export const deleteComponentSpecWorkflow = createWorkflow(
  "delete-component-spec",
  (input: DeleteComponentSpecWorkflowInput) => {
    const links = transform({ input }, ({ input }) => [
      {
        [Modules.PRODUCT]: { product_id: input.product_id },
        [COMPONENT_SPEC_MODULE]: { component_spec_id: input.id },
      },
    ])

    dismissRemoteLinkStep(links)
    deleteComponentSpecStep(input.id)

    return new WorkflowResponse({ id: input.id, deleted: true })
  }
)
