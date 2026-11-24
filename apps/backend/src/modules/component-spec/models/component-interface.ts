import { model } from "@medusajs/framework/utils"
import ComponentSpec from "./component-spec"

/** Sąsaja, kurios komponentas reikalauja iš mikrovaldiklio (1:N). */
const ComponentInterface = model.define("component_interface", {
  id: model.id({ prefix: "cif" }).primaryKey(),
  type: model.enum(["i2c", "spi", "uart", "analog_in", "digital_io", "pwm", "onewire"]),
  pin_count: model.number().default(1),
  // Galimi I2C adresai (dešimtainiai skaičiai, pvz. [118, 119] = 0x76, 0x77)
  i2c_addresses: model.json<number[]>().nullable(),
  i2c_address_selectable: model.boolean().default(false),
  spec: model.belongsTo(() => ComponentSpec, { mappedBy: "interfaces" }),
})

export default ComponentInterface
