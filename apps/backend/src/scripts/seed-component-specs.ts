/**
 * Techninių specifikacijų seed: kiekvienam katalogo produktui (pagal handle)
 * sukuria ComponentSpec su sąsajomis, bėgeliais ir MCU galimybėmis iš
 * src/lib/component-spec-data.ts ir susieja su produktu.
 *
 *   npx medusa exec ./src/scripts/seed-component-specs.ts
 *
 * Idempotentiškas: produktai, kurie jau turi specifikaciją, praleidžiami.
 * Norint perrašyti, specifikaciją reikia ištrinti per admin API.
 */
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { COMPONENT_SPECS, type ComponentSpecData } from "../lib/component-spec-data"
import { createComponentSpecWorkflow } from "../workflows/component-spec"
import type { ComponentSpecInput } from "../workflows/component-spec"

/** Variklio (camelCase) duomenys -> DB/API (snake_case) įvestis. */
export function toComponentSpecInput(data: ComponentSpecData): ComponentSpecInput {
  return {
    category: data.category,
    supply_voltage_min_v: data.supplyVoltageMinV,
    supply_voltage_max_v: data.supplyVoltageMaxV,
    logic_voltage_v: data.logicVoltageV,
    input_high_min_v: data.inputHighMinV,
    is_five_volt_tolerant: data.isFiveVoltTolerant,
    current_typ_ma: data.currentTypMa,
    current_max_ma: data.currentMaxMa,
    datasheet_url: data.datasheetUrl,
    datasheet_note: data.datasheetNote,
    notes: data.notes ?? null,
    attributes: (data.attributes as Record<string, unknown> | undefined) ?? null,
    interfaces: data.interfaces.map((iface) => ({
      type: iface.type,
      pin_count: iface.pinCount,
      i2c_addresses: iface.i2cAddresses ?? null,
      i2c_address_selectable: iface.i2cAddressSelectable ?? false,
    })),
    power_rails: data.powerRails.map((rail) => ({
      label: rail.label,
      voltage_v: rail.voltageV,
      max_current_ma: rail.maxCurrentMa,
    })),
    mcu: data.mcu
      ? {
          digital_pins: data.mcu.digitalPins,
          analog_inputs: data.mcu.analogInputs,
          analog_inputs_usable_with_wifi: data.mcu.analogInputsUsableWithWifi,
          pwm_pins: data.mcu.pwmPins,
          i2c_buses: data.mcu.i2cBuses,
          spi_buses: data.mcu.spiBuses,
          uarts: data.mcu.uarts,
          has_wifi: data.mcu.hasWifi,
          io_voltage_v: data.mcu.ioVoltageV,
          is_five_volt_tolerant: data.mcu.isFiveVoltTolerant,
        }
      : null,
  }
}

export default async function seedComponentSpecs({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "component_spec.id"],
  })
  // Link'o laukas į sugeneruotus Query tipus patenka tik po build, todėl tipas nurodomas rankomis.
  const products = data as Array<{
    id: string
    handle: string | null
    component_spec?: { id: string } | null
  }>

  const productByHandle = new Map(products.map((product) => [product.handle, product]))

  let created = 0
  let skipped = 0
  const missingProducts: string[] = []

  for (const [handle, data] of Object.entries(COMPONENT_SPECS)) {
    const product = productByHandle.get(handle)
    if (!product) {
      missingProducts.push(handle)
      continue
    }
    if (product.component_spec?.id) {
      skipped++
      continue
    }

    await createComponentSpecWorkflow(container).run({
      input: { product_id: product.id, ...toComponentSpecInput(data) },
    })
    created++
  }

  logger.info(
    `Specifikacijų seed: sukurta ${created}, jau buvo ${skipped}, aprašyta ${Object.keys(COMPONENT_SPECS).length}.`
  )
  if (missingProducts.length) {
    logger.warn(`Kataloge nerasti produktai: ${missingProducts.join(", ")}. Paleiskite seed-components.ts.`)
  }

  const withoutSpec = products.filter(
    (product) => !product.component_spec?.id && !COMPONENT_SPECS[product.handle ?? ""]
  )
  if (withoutSpec.length) {
    logger.warn(
      `Produktai be specifikacijos duomenų: ${withoutSpec.map((product) => product.handle).join(", ")}`
    )
  }
}
