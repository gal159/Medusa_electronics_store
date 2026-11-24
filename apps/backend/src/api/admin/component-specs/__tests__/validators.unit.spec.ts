import { CreateComponentSpecSchema, UpdateComponentSpecSchema } from "../validators"

describe("component-spec validatoriai", () => {
  it("regresija: atnaujinimas be lauko jo neperrašo numatytąja reikšme", () => {
    const parsed = UpdateComponentSpecSchema.parse({ notes: "pastaba" })

    expect(parsed).toEqual({ notes: "pastaba" })
    expect("datasheet_url" in parsed).toBe(false)
    expect("is_five_volt_tolerant" in parsed).toBe(false)
  })

  it("kuriant taikomos numatytosios reikšmės", () => {
    const parsed = CreateComponentSpecSchema.parse({ product_id: "prod_1", category: "sensor" })

    expect(parsed.datasheet_url).toBe("")
    expect(parsed.is_five_volt_tolerant).toBe(false)
  })

  it("atmeta min > max ir MCU galimybes ne mcu_board kategorijai", () => {
    expect(
      UpdateComponentSpecSchema.safeParse({ supply_voltage_min_v: 5, supply_voltage_max_v: 3 }).success
    ).toBe(false)
    expect(
      CreateComponentSpecSchema.safeParse({
        product_id: "prod_1",
        category: "sensor",
        mcu: {
          digital_pins: 1,
          analog_inputs: 0,
          pwm_pins: 0,
          i2c_buses: 0,
          spi_buses: 0,
          uarts: 0,
          has_wifi: false,
          io_voltage_v: 3.3,
          is_five_volt_tolerant: false,
        },
      }).success
    ).toBe(false)
  })
})
