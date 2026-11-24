import { calculateDemand, r6PinBudget } from "../rules/r6-pin-budget"
import { item, kit } from "./kit-fixtures"

describe("R6 Kontaktų ir sąsajų pakankamumas", () => {
  it("be MCU tyli", () => {
    expect(r6PinBudget.evaluate(kit(item("hc-sr04", 10)))).toEqual([])
  })

  it("be pastabų: Uno su BME280 (I2C), HC-SR04 (2 GPIO), SG90 (PWM), DHT22 (1-Wire)", () => {
    const results = r6PinBudget.evaluate(
      kit(item("arduino-uno-r3"), item("bme280-modulis-3v3"), item("hc-sr04"), item("sg90-servo"), item("dht22-am2302"))
    )
    expect(results).toEqual([])
  })

  it("I2C magistralė dalijama: 3 I2C įrenginiai užima tik 2 kontaktus", () => {
    const demand = calculateDemand([
      item("bme280-modulis-3v3"),
      item("ssd1306-oled-0-96"),
      item("mpu-6050-gy-521"),
    ])
    expect(demand.digital).toBe(2)
    expect(demand.usesI2c).toBe(true)
  })

  it("SPI: 3 bendri + nuosavi kiekvienam nRF24L01+ (5 kontaktai → 2 nuosavi)", () => {
    const demand = calculateDemand([item("nrf24l01-plus", 2)])
    expect(demand.digital).toBe(3 + 2 * 2)
  })

  it("klaida: 4× 28BYJ-48 reikalauja 16 GPIO, Uno turi 14", () => {
    const results = r6PinBudget.evaluate(kit(item("arduino-uno-r3"), item("28byj-48-uln2003", 4)))

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ ruleId: "R6", severity: "error" })
    expect(results[0].message).toContain("16")
    expect(results[0].involvedItemIds).toContain("item_arduino-uno-r3")
  })

  it("be pastabų: 4× 28BYJ-48 su ESP32 (34 GPIO)", () => {
    expect(r6PinBudget.evaluate(kit(item("esp32-devkit-v1"), item("28byj-48-uln2003", 4)))).toEqual([])
  })

  it("klaida: 2× HC-05 reikalauja 2 UART, Uno turi 1", () => {
    const results = r6PinBudget.evaluate(kit(item("arduino-uno-r3"), item("hc-05-bluetooth", 2)))

    expect(results).toHaveLength(1)
    expect(results[0].message).toContain("UART")
  })

  it("be pastabų: 2× HC-05 su ESP32 (3 UART)", () => {
    expect(r6PinBudget.evaluate(kit(item("esp32-devkit-v1"), item("hc-05-bluetooth", 2)))).toEqual([])
  })

  it("klaida: 7 PWM servo viršija Uno 6 PWM kanalus", () => {
    const results = r6PinBudget.evaluate(kit(item("arduino-uno-r3"), item("sg90-servo", 7)))

    expect(results.map((result) => result.message.includes("PWM"))).toEqual([true])
  })

  it("klaida: analoginių įėjimų poreikis viršija Pico 3 ADC (sintetinis 4 analoginių jutiklių atvejis)", () => {
    const analogSensor = item("bh1750", 4, {
      spec: { interfaces: [{ type: "analog_in", pinCount: 1 }] },
    })
    const results = r6PinBudget.evaluate(kit(item("raspberry-pi-pico"), analogSensor))

    expect(results).toHaveLength(1)
    expect(results[0].message).toContain("analoginių")
  })
})
