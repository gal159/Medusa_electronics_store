import { Module } from "@medusajs/framework/utils"
import ComponentSpecModuleService from "./service"

export const COMPONENT_SPEC_MODULE = "componentSpec"

export default Module(COMPONENT_SPEC_MODULE, {
  service: ComponentSpecModuleService,
})
