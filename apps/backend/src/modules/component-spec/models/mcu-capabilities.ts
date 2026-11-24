import { model } from "@medusajs/framework/utils"
import ComponentSpec from "./component-spec"

/** Ką mikrovaldiklio plokštė suteikia (1:1, tik `mcu_board` kategorijai). */
const McuCapabilities = model.define("mcu_capabilities", {
  id: model.id({ prefix: "mcu" }).primaryKey(),
  digital_pins: model.number(),
  analog_inputs: model.number(),
  // null = Wi-Fi neriboja ADC (ESP32 ADC2 atvejis)
  analog_inputs_usable_with_wifi: model.number().nullable(),
  pwm_pins: model.number(),
  i2c_buses: model.number(),
  spi_buses: model.number(),
  uarts: model.number(),
  has_wifi: model.boolean().default(false),
  io_voltage_v: model.float(),
  is_five_volt_tolerant: model.boolean().default(false),
  spec: model.belongsTo(() => ComponentSpec, { mappedBy: "mcu" }),
})

export default McuCapabilities
