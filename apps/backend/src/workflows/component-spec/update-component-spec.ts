import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { COMPONENT_SPEC_MODULE } from "../../modules/component-spec"
import type ComponentSpecModuleService from "../../modules/component-spec/service"
import type { UpdateComponentSpecWorkflowInput } from "./types"

/**
 * Atnaujina skaliarinius laukus; vaikiniai sąrašai (interfaces, power_rails,
 * mcu), jei perduoti, pakeičiami visi: ištrinami seni ir sukuriami nauji.
 * Toks „pakeisti viską“ modelis paprastesnis už dalinį suliejimą ir atitinka
 * admin formą, kuri visada siunčia pilną sąrašą.
 */
export const updateComponentSpecStep = createStep(
  "update-component-spec",
  async (input: UpdateComponentSpecWorkflowInput, { container }) => {
    const service = container.resolve<ComponentSpecModuleService>(COMPONENT_SPEC_MODULE)
    const { id, interfaces, power_rails, mcu, ...scalars } = input

    const previous = await service.retrieveComponentSpec(id, {
      relations: ["interfaces", "power_rails", "mcu"],
    })

    if (Object.keys(scalars).length) {
      await service.updateComponentSpecs({ id, ...scalars })
    }

    if (interfaces !== undefined) {
      await service.deleteComponentInterfaces({ spec_id: id })
      if (interfaces.length) {
        await service.createComponentInterfaces(
          interfaces.map((iface) => ({ ...iface, spec_id: id }))
        )
      }
    }

    if (power_rails !== undefined) {
      await service.deletePowerRails({ spec_id: id })
      if (power_rails.length) {
        await service.createPowerRails(power_rails.map((rail) => ({ ...rail, spec_id: id })))
      }
    }

    if (mcu !== undefined) {
      await service.deleteMcuCapabilities({ spec_id: id })
      if (mcu) {
        await service.createMcuCapabilities({ ...mcu, spec_id: id })
      }
    }

    const updated = await service.retrieveComponentSpec(id, {
      relations: ["interfaces", "power_rails", "mcu"],
    })

    return new StepResponse(updated, previous)
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }
    // Kompensacija: grąžina ankstesnę būseną tuo pačiu „pakeisti viską“ būdu.
    const service = container.resolve<ComponentSpecModuleService>(COMPONENT_SPEC_MODULE)
    const { id, interfaces, power_rails, mcu, created_at, updated_at, deleted_at, ...scalars } =
      previous

    await service.updateComponentSpecs({ id, ...scalars })
    await service.deleteComponentInterfaces({ spec_id: id })
    await service.deletePowerRails({ spec_id: id })
    await service.deleteMcuCapabilities({ spec_id: id })

    if (interfaces?.length) {
      await service.createComponentInterfaces(
        interfaces.map(({ id: _id, spec: _spec, ...iface }) => ({ ...iface, spec_id: id }))
      )
    }
    if (power_rails?.length) {
      await service.createPowerRails(
        power_rails.map(({ id: _id, spec: _spec, ...rail }) => ({ ...rail, spec_id: id }))
      )
    }
    if (mcu) {
      const { id: _id, spec: _spec, ...caps } = mcu
      await service.createMcuCapabilities({ ...caps, spec_id: id })
    }
  }
)

export const updateComponentSpecWorkflow = createWorkflow(
  "update-component-spec",
  (input: UpdateComponentSpecWorkflowInput) => {
    const spec = updateComponentSpecStep(input)
    return new WorkflowResponse(spec)
  }
)
