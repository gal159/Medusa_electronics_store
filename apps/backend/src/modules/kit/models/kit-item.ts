import { model } from "@medusajs/framework/utils"
import Kit from "./kit"

/** Rinkinio eilutė: produkto variantas su kiekiu ir (neprivalomai) priskirtu bėgeliu. */
const KitItem = model.define("kit_item", {
  id: model.id({ prefix: "kitem" }).primaryKey(),
  variant_id: model.text(),
  product_id: model.text(),
  quantity: model.number().default(1),
  assigned_rail_label: model.text().nullable(),
  kit: model.belongsTo(() => Kit, { mappedBy: "items" }),
})

export default KitItem
