import { Module } from "@medusajs/framework/utils"
import KitModuleService from "./service"

export const KIT_MODULE = "kit"

export default Module(KIT_MODULE, {
  service: KitModuleService,
})
