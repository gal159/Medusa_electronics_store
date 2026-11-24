import { LEVEL_SHIFTER_HANDLE, r3LogicLevels } from "../rules/r3-logic-levels"
import { item, kit } from "./kit-fixtures"

describe("R3 Loginiai lygiai", () => {
  it("klaida: HC-SR04 5 V ECHO į ESP32 3,3 V GPIO", () => {
    const results = r3LogicLevels.evaluate(kit(item("esp32-devkit-v1"), item("hc-sr04")))

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ ruleId: "R3", severity: "error" })
    expect(results[0].involvedItemIds).toEqual(["item_hc-sr04", "item_esp32-devkit-v1"])
    expect(results[0].suggestion?.productHandle).toBe(LEVEL_SHIFTER_HANDLE)
  })

  it("be pastabų: HC-SR04 su Arduino Uno (5 V GPIO)", () => {
    expect(r3LogicLevels.evaluate(kit(item("arduino-uno-r3"), item("hc-sr04")))).toEqual([])
  })

  it("be pastabų: Raspberry Pi Pico su 3,3 V BME280 ir SSD1306", () => {
    const results = r3LogicLevels.evaluate(
      kit(item("raspberry-pi-pico"), item("bme280-modulis-3v3"), item("ssd1306-oled-0-96"))
    )
    expect(results).toEqual([])
  })

  it("klaida: Uno 5 V SDA/SCL į BME280, kurio VDDIO max 3,6 V", () => {
    const results = r3LogicLevels.evaluate(kit(item("arduino-uno-r3"), item("bme280-modulis-3v3")))

    expect(results).toHaveLength(1)
    expect(results[0].severity).toBe("error")
    expect(results[0].message).toContain("netoleruoja")
  })

  it("be pastabų: Uno 5 V į nRF24L01+, kurio įėjimai 5 V tolerantiški", () => {
    expect(r3LogicLevels.evaluate(kit(item("arduino-uno-r3"), item("nrf24l01-plus")))).toEqual([])
  })

  it("įspėjimas: ESP32 3,3 V į WS2812B DIN, kuriam reikia ≥ 3,5 V", () => {
    const results = r3LogicLevels.evaluate(kit(item("esp32-devkit-v1"), item("ws2812b-juosta-1m")))

    expect(results).toHaveLength(1)
    expect(results[0].severity).toBe("warning")
    expect(results[0].message).toContain("3,5 V")
  })

  it("be pastabų: Uno 5 V į WS2812B DIN", () => {
    expect(r3LogicLevels.evaluate(kit(item("arduino-uno-r3"), item("ws2812b-juosta-1m")))).toEqual([])
  })

  it("klaida: LCD1602 su 5 V I2C pull-up rezistoriais prie Pico", () => {
    const results = r3LogicLevels.evaluate(kit(item("raspberry-pi-pico"), item("lcd-1602-i2c")))
    expect(results.map((result) => result.severity)).toEqual(["error"])
  })

  it("su lygių keitikliu rinkinyje neatitikimas tampa info ir neblokuoja užsakymo", () => {
    const results = r3LogicLevels.evaluate(
      kit(item("esp32-devkit-v1"), item("hc-sr04"), item("lygiu-keitiklis-bss138-4ch"))
    )

    expect(results).toHaveLength(1)
    expect(results[0].severity).toBe("info")
    expect(results[0].suggestion?.productHandle).toBeUndefined()
    expect(results[0].suggestion?.text).toContain("keitiklis")
  })

  it("analoginiai jutikliai be skaitmeninių signalų netikrinami", () => {
    const results = r3LogicLevels.evaluate(
      kit(
        item("esp32-devkit-v1"),
        item("hc-sr04", 1, { spec: { interfaces: [{ type: "analog_in", pinCount: 1 }] } })
      )
    )
    expect(results).toEqual([])
  })

  it("be MCU taisyklė tyli", () => {
    expect(r3LogicLevels.evaluate(kit(item("hc-sr04")))).toEqual([])
  })
})
