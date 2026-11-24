import { evaluateKit } from "../engine"
import { r8Accessories } from "../rules/r8-accessories"
import { item, kit } from "./kit-fixtures"

describe("R8 Priedai", () => {
  it("ESP32 + BME280 be priedų: trys info (plokštė, laidai, Micro-USB kabelis)", () => {
    const results = r8Accessories.evaluate(kit(item("esp32-devkit-v1"), item("bme280-modulis-3v3")))

    expect(results.map((result) => result.severity)).toEqual(["info", "info", "info"])
    expect(results.map((result) => result.suggestion?.productHandle)).toEqual([
      "breadboard-830",
      "jumper-laidai-120",
      "micro-usb-kabelis-1m",
    ])
  })

  it("Uno (USB-B) su plokšte ir laidais: be pastabų", () => {
    const results = r8Accessories.evaluate(
      kit(item("arduino-uno-r3"), item("hc-sr04"), item("breadboard-830"), item("jumper-laidai-120"))
    )
    expect(results).toEqual([])
  })

  it("vien MCU be periferijos: tik kabelio pastaba Micro-USB plokštei", () => {
    const results = r8Accessories.evaluate(kit(item("raspberry-pi-pico")))
    expect(results.map((result) => result.suggestion?.productHandle)).toEqual(["micro-usb-kabelis-1m"])
  })

  it("info niekada neblokuoja užsakymo", () => {
    const report = evaluateKit(kit(item("esp32-devkit-v1"), item("bme280-modulis-3v3")))
    expect(report.isOrderable).toBe(true)
    expect(report.summary.infos).toBeGreaterThanOrEqual(3)
  })
})
