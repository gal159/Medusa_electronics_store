import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import ComponentSpecModule from "../modules/component-spec"

/**
 * Produktas <-> specifikacija (1:1). Link lentelė kuriama `medusa db:migrate`
 * (sync-links). Per Query: product.component_spec ir component_spec.product.
 */
export default defineLink(ProductModule.linkable.product, ComponentSpecModule.linkable.componentSpec)
