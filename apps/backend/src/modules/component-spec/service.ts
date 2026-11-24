import { MedusaService } from "@medusajs/framework/utils"
import { ComponentInterface, ComponentSpec, McuCapabilities, PowerRail } from "./models"

/**
 * Servisas generuojamas iš modelių: createComponentSpecs, listComponentSpecs,
 * retrieveComponentSpec, updateComponentSpecs, deleteComponentSpecs ir t. t.
 * (Medusa service factory). Vaikiniai modeliai (interfaces, power_rails, mcu)
 * kuriami kartu su specifikacija perduodant juos kaip įdėtus objektus.
 */
class ComponentSpecModuleService extends MedusaService({
  ComponentSpec,
  ComponentInterface,
  PowerRail,
  McuCapabilities,
}) {}

export default ComponentSpecModuleService
