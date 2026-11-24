/**
 * Taisyklių registras. Nauja taisyklė = naujas failas + vienas įrašas čia.
 */
import type { CompatibilityRule } from "../types"
import { r1McuPresence } from "./r1-mcu-presence"
import { r2SupplyVoltage } from "./r2-supply-voltage"
import { r3LogicLevels } from "./r3-logic-levels"
import { r4CurrentBudget } from "./r4-current-budget"
import { r5I2cAddresses } from "./r5-i2c-addresses"
import { r6PinBudget } from "./r6-pin-budget"
import { r7AdcWithWifi } from "./r7-adc-with-wifi"
import { r8Accessories } from "./r8-accessories"
import { r9LedControl } from "./r9-led-control"

export const ALL_RULES: readonly CompatibilityRule[] = [
  r1McuPresence,
  r2SupplyVoltage,
  r3LogicLevels,
  r4CurrentBudget,
  r5I2cAddresses,
  r6PinBudget,
  r7AdcWithWifi,
  r8Accessories,
  r9LedControl,
]

export {
  r1McuPresence,
  r2SupplyVoltage,
  r3LogicLevels,
  r4CurrentBudget,
  r5I2cAddresses,
  r6PinBudget,
  r7AdcWithWifi,
  r8Accessories,
  r9LedControl,
}
