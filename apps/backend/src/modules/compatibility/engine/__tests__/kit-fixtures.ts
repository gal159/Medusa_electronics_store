/**
 * Testų pagalbininkai: rinkinys sudaromas iš realių komponentų specifikacijų
 * (src/lib/component-spec-data.ts), kad testai tikrintų tikrus atvejus.
 */
import { COMPONENT_SPECS } from "../../../../lib/component-spec-data"
import type { ComponentSpecSnapshot, KitItemSnapshot, KitSnapshot } from "../types"

export type Handle = keyof typeof COMPONENT_SPECS

export function specOf(handle: Handle): ComponentSpecSnapshot {
  const data = COMPONENT_SPECS[handle]
  if (!data) {
    throw new Error(`Nežinomas komponentas testuose: ${handle}`)
  }
  return {
    specId: `spec_${handle}`,
    productId: `prod_${handle}`,
    productHandle: handle,
    title: handle,
    category: data.category,
    supplyVoltageMinV: data.supplyVoltageMinV,
    supplyVoltageMaxV: data.supplyVoltageMaxV,
    logicVoltageV: data.logicVoltageV,
    inputHighMinV: data.inputHighMinV,
    isFiveVoltTolerant: data.isFiveVoltTolerant,
    currentTypMa: data.currentTypMa,
    currentMaxMa: data.currentMaxMa,
    datasheetUrl: data.datasheetUrl,
    interfaces: data.interfaces,
    powerRails: data.powerRails,
    mcu: data.mcu,
    attributes: data.attributes ?? null,
  }
}

export function item(
  handle: Handle,
  quantity = 1,
  overrides: Partial<Omit<KitItemSnapshot, "spec">> & { spec?: Partial<ComponentSpecSnapshot> } = {}
): KitItemSnapshot {
  const { spec: specOverrides, ...rest } = overrides
  return {
    itemId: `item_${handle}`,
    quantity,
    spec: { ...specOf(handle), ...specOverrides },
    ...rest,
  }
}

export function kit(...items: KitItemSnapshot[]): KitSnapshot {
  return { items }
}
