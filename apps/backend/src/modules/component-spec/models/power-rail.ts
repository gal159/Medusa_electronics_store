import { model } from "@medusajs/framework/utils"
import ComponentSpec from "./component-spec"

/** Maitinimo bėgelis, kurį suteikia MCU plokštė arba maitinimo modulis (1:N). */
const PowerRail = model.define("power_rail", {
  id: model.id({ prefix: "rail" }).primaryKey(),
  label: model.text(),
  voltage_v: model.float(),
  // null = riba nežinoma; R4 tokio bėgelio netikrina
  max_current_ma: model.float().nullable(),
  spec: model.belongsTo(() => ComponentSpec, { mappedBy: "power_rails" }),
})

export default PowerRail
