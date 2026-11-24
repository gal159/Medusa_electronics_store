import { MedusaService } from "@medusajs/framework/utils"
import Kit from "./models/kit"
import KitItem from "./models/kit-item"

class KitModuleService extends MedusaService({ Kit, KitItem }) {}

export default KitModuleService
