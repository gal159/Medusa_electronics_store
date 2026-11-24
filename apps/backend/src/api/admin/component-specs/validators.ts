import { z } from "@medusajs/framework/zod"

const nullableNumber = z.number().nullable().optional()

export const SPEC_CATEGORIES = [
  "mcu_board",
  "sensor",
  "display",
  "actuator",
  "power",
  "communication",
  "passive",
  "accessory",
  "led_controller",
] as const

export const InterfaceSchema = z.object({
  type: z.enum(["i2c", "spi", "uart", "analog_in", "digital_io", "pwm", "onewire"]),
  pin_count: z.number().int().min(0).default(1),
  i2c_addresses: z.array(z.number().int().min(0).max(0x7f)).nullable().optional(),
  i2c_address_selectable: z.boolean().default(false),
})

export const PowerRailSchema = z.object({
  label: z.string().min(1),
  voltage_v: z.number().positive(),
  max_current_ma: z.number().positive().nullable().optional(),
})

export const McuCapabilitiesSchema = z.object({
  digital_pins: z.number().int().min(0),
  analog_inputs: z.number().int().min(0),
  analog_inputs_usable_with_wifi: z.number().int().min(0).nullable().optional(),
  pwm_pins: z.number().int().min(0),
  i2c_buses: z.number().int().min(0),
  spi_buses: z.number().int().min(0),
  uarts: z.number().int().min(0),
  has_wifi: z.boolean(),
  io_voltage_v: z.number().positive(),
  is_five_volt_tolerant: z.boolean(),
})

/**
 * Bazinė schema BE `.default()`: Zod `.partial()` numatytųjų reikšmių
 * nepašalina, todėl atnaujinimo užklausa be lauko jį perrašytų (2026-11-15
 * klaida: atnaujinus `notes` HC-SR04 prarado datasheet_url ir 5 V toleranciją).
 * Numatytosios reikšmės taikomos tik kuriant (`CreateComponentSpecSchema`).
 */
const ComponentSpecBaseSchema = z.object({
  category: z.enum(SPEC_CATEGORIES),
  supply_voltage_min_v: nullableNumber,
  supply_voltage_max_v: nullableNumber,
  logic_voltage_v: nullableNumber,
  input_high_min_v: nullableNumber,
  is_five_volt_tolerant: z.boolean(),
  current_typ_ma: nullableNumber,
  current_max_ma: nullableNumber,
  datasheet_url: z.string(),
  datasheet_note: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  attributes: z
    .object({
      ledProtocol: z.enum(["ws2812b", "ws2811", "single_color"]).optional(),
      perMeter: z.boolean().optional(),
      supportedProtocols: z.array(z.enum(["ws2812b", "ws2811", "single_color"])).optional(),
      outputCurrentMaxMa: z.number().positive().nullable().optional(),
    })
    .nullable()
    .optional(),
  interfaces: z.array(InterfaceSchema).optional(),
  power_rails: z.array(PowerRailSchema).optional(),
  mcu: McuCapabilitiesSchema.nullable().optional(),
})

/** Maitinimo intervalas turi būti nuoseklus; MCU galimybės tik mcu_board kategorijai. */
const refineSpec = (
  data: {
    supply_voltage_min_v?: number | null
    supply_voltage_max_v?: number | null
    category?: string
    mcu?: unknown
  },
  ctx: z.RefinementCtx
) => {
  const { supply_voltage_min_v: min, supply_voltage_max_v: max } = data
  if (min != null && max != null && min > max) {
    ctx.addIssue({
      code: "custom",
      path: ["supply_voltage_max_v"],
      message: "supply_voltage_max_v turi būti ≥ supply_voltage_min_v",
    })
  }
  if (data.mcu && data.category && data.category !== "mcu_board") {
    ctx.addIssue({
      code: "custom",
      path: ["mcu"],
      message: "mcu galimybės leidžiamos tik kategorijai mcu_board",
    })
  }
}

export const CreateComponentSpecSchema = ComponentSpecBaseSchema.extend({
  product_id: z.string().min(1),
  is_five_volt_tolerant: z.boolean().default(false),
  datasheet_url: z.string().default(""),
}).superRefine(refineSpec)

export const UpdateComponentSpecSchema = ComponentSpecBaseSchema.partial().superRefine(refineSpec)

export const ListComponentSpecsQuerySchema = z.object({
  product_id: z.string().optional(),
  category: z.enum(SPEC_CATEGORIES).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type CreateComponentSpecBody = z.infer<typeof CreateComponentSpecSchema>
export type UpdateComponentSpecBody = z.infer<typeof UpdateComponentSpecSchema>
export type ListComponentSpecsQuery = z.infer<typeof ListComponentSpecsQuerySchema>
