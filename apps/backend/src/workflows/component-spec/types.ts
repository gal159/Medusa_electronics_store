/** Įvesties tipai component-spec workflow'ams (atitinka admin API validatorius). */

export type SpecCategoryInput =
  | "mcu_board"
  | "sensor"
  | "display"
  | "actuator"
  | "power"
  | "communication"
  | "passive"
  | "accessory"
  | "led_controller"

export type InterfaceInput = {
  type: "i2c" | "spi" | "uart" | "analog_in" | "digital_io" | "pwm" | "onewire"
  pin_count: number
  i2c_addresses?: number[] | null
  i2c_address_selectable?: boolean
}

export type PowerRailInput = {
  label: string
  voltage_v: number
  max_current_ma?: number | null
}

export type McuCapabilitiesInput = {
  digital_pins: number
  analog_inputs: number
  analog_inputs_usable_with_wifi?: number | null
  pwm_pins: number
  i2c_buses: number
  spi_buses: number
  uarts: number
  has_wifi: boolean
  io_voltage_v: number
  is_five_volt_tolerant: boolean
}

export type ComponentSpecInput = {
  category: SpecCategoryInput
  supply_voltage_min_v?: number | null
  supply_voltage_max_v?: number | null
  logic_voltage_v?: number | null
  input_high_min_v?: number | null
  is_five_volt_tolerant?: boolean
  current_typ_ma?: number | null
  current_max_ma?: number | null
  datasheet_url: string
  datasheet_note?: string | null
  notes?: string | null
  attributes?: Record<string, unknown> | null
  interfaces?: InterfaceInput[]
  power_rails?: PowerRailInput[]
  mcu?: McuCapabilitiesInput | null
}

export type CreateComponentSpecWorkflowInput = ComponentSpecInput & {
  product_id: string
}

export type UpdateComponentSpecWorkflowInput = Partial<ComponentSpecInput> & {
  id: string
}
