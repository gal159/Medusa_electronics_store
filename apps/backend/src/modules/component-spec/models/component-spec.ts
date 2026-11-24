import { model } from "@medusajs/framework/utils"
import ComponentInterface from "./component-interface"
import McuCapabilities from "./mcu-capabilities"
import PowerRail from "./power-rail"

/**
 * Parduodamo modulio techninė specifikacija. Su produktu susiejama module
 * link'u (src/links/product-component-spec.ts), todėl Product modelis
 * nekeičiamas. Fizikiniai dydžiai turi vienetą pavadinime (…_v, …_ma).
 */
const ComponentSpec = model
  .define("component_spec", {
    id: model.id({ prefix: "cspec" }).primaryKey(),
    category: model.enum([
      "mcu_board",
      "sensor",
      "display",
      "actuator",
      "power",
      "communication",
      "passive",
      "accessory",
      // Paruoštas LED juostų valdiklis (ne programuojamas MCU), pvz. SP110E, dimeris
      "led_controller",
    ]),
    supply_voltage_min_v: model.float().nullable(),
    supply_voltage_max_v: model.float().nullable(),
    logic_voltage_v: model.float().nullable(),
    input_high_min_v: model.float().nullable(),
    is_five_volt_tolerant: model.boolean().default(false),
    current_typ_ma: model.float().nullable(),
    current_max_ma: model.float().nullable(),
    datasheet_url: model.text(),
    // Iš kurio dokumento skyriaus paimtos vertės: privaloma gynimui ir R-rezultatų `source`.
    datasheet_note: model.text().nullable(),
    notes: model.text().nullable(),
    // Sričiai specifiniai duomenys (LED juostos protokolas, valdiklio išėjimo srovė),
    // žr. ComponentAttributes compatibility/engine/types.ts
    attributes: model.json().nullable(),
    interfaces: model.hasMany(() => ComponentInterface, { mappedBy: "spec" }),
    power_rails: model.hasMany(() => PowerRail, { mappedBy: "spec" }),
    mcu: model.hasOne(() => McuCapabilities, { mappedBy: "spec" }).nullable(),
  })
  .cascades({
    delete: ["interfaces", "power_rails", "mcu"],
  })

export default ComponentSpec
