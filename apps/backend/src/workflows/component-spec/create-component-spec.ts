import { Modules } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"
import { COMPONENT_SPEC_MODULE } from "../../modules/component-spec"
import type ComponentSpecModuleService from "../../modules/component-spec/service"
import type { ComponentSpecInput, CreateComponentSpecWorkflowInput } from "./types"

/**
 * Žingsnis: sukuria specifikaciją su vaikiniais įrašais (interfaces,
 * power_rails, mcu). Kompensacija ištrina ją, jei vėlesnis žingsnis (link) lūžta.
 */
export const createComponentSpecStep = createStep(
  "create-component-spec",
  async (input: ComponentSpecInput, { container }) => {
    const service = container.resolve<ComponentSpecModuleService>(COMPONENT_SPEC_MODULE)
    const { mcu, interfaces = [], power_rails = [], ...specData } = input

    // Service factory tipai ryšius priima kaip id, todėl vaikiniai įrašai
    // kuriami atskirais kvietimais su spec_id (taip pat daro ir update žingsnis).
    const spec = await service.createComponentSpecs(specData)

    if (interfaces.length) {
      await service.createComponentInterfaces(
        interfaces.map((iface) => ({ ...iface, spec_id: spec.id }))
      )
    }
    if (power_rails.length) {
      await service.createPowerRails(power_rails.map((rail) => ({ ...rail, spec_id: spec.id })))
    }
    if (mcu) {
      await service.createMcuCapabilities({ ...mcu, spec_id: spec.id })
    }

    return new StepResponse(spec, spec.id)
  },
  async (specId, { container }) => {
    if (!specId) {
      return
    }
    const service = container.resolve<ComponentSpecModuleService>(COMPONENT_SPEC_MODULE)
    await service.deleteComponentSpecs(specId)
  }
)

/**
 * Sukuria specifikaciją ir susieja ją su produktu. Link'as kuriamas atskiru
 * core žingsniu, kad nepavykus jis būtų atšauktas kartu su specifikacija.
 */
export const createComponentSpecWorkflow = createWorkflow(
  "create-component-spec",
  (input: CreateComponentSpecWorkflowInput) => {
    const specInput = transform({ input }, ({ input: { product_id: _productId, ...rest } }) => rest)

    const spec = createComponentSpecStep(specInput)

    const links = transform({ input, spec }, ({ input, spec }) => [
      {
        [Modules.PRODUCT]: { product_id: input.product_id },
        [COMPONENT_SPEC_MODULE]: { component_spec_id: spec.id },
      },
    ])

    createRemoteLinkStep(links)

    return new WorkflowResponse(spec)
  }
)
