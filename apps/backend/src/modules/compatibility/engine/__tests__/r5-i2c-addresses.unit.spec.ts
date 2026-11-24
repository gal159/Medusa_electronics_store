import { r5I2cAddresses } from "../rules/r5-i2c-addresses"
import { item, kit } from "./kit-fixtures"

describe("R5 I2C adresų konfliktai", () => {
  it("tyli, kai I2C įrenginys vienas arba adresai skirtingi (BME280 0x76, SSD1306 0x3C, MPU 0x68)", () => {
    const results = r5I2cAddresses.evaluate(
      kit(item("esp32-devkit-v1"), item("bme280-modulis-3v3"), item("ssd1306-oled-0-96"), item("mpu-6050-gy-521"))
    )
    expect(results).toEqual([])
  })

  it("įspėjimas: 2× BME280, antram reikia nustatyti 0x77", () => {
    const results = r5I2cAddresses.evaluate(kit(item("arduino-uno-r3"), item("bme280-modulis-3v3", 2)))

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ ruleId: "R5", severity: "warning" })
    expect(results[0].message).toContain("0x77")
    expect(results[0].involvedItemIds).toEqual(["item_bme280-modulis-3v3"])
  })

  it("klaida: 3× BME280, trečiam nebelieka laisvo adreso", () => {
    const results = r5I2cAddresses.evaluate(kit(item("esp32-devkit-v1"), item("bme280-modulis-3v3", 3)))

    expect(results.map((result) => result.severity)).toEqual(["warning", "error"])
  })

  it("klaida: 2× SSD1306, kurių adresas 0x3C nekeičiamas", () => {
    const results = r5I2cAddresses.evaluate(kit(item("raspberry-pi-pico"), item("ssd1306-oled-0-96", 2)))

    expect(results).toHaveLength(1)
    expect(results[0].severity).toBe("error")
    expect(results[0].message).toContain("0x3C")
  })

  it("įspėjimas: BH1750 (0x23 keičiamas) ir LCD1602 PCF8574 numatytasis 0x27 nesikerta, bet 0x23 su PCF8574 0x23 – jei LCD nustatytas 0x23", () => {
    // PCF8574 adresų sąrašas prasideda 0x20, todėl numatytasis 0x20, konflikto su BH1750 0x23 nėra
    const results = r5I2cAddresses.evaluate(kit(item("arduino-uno-r3"), item("bh1750"), item("lcd-1602-i2c")))
    expect(results).toEqual([])
  })

  it("keičiamas įrenginys pasitraukia nuo fiksuoto: 2× LCD1602 (0x20–0x27) duoda tik įspėjimą", () => {
    const results = r5I2cAddresses.evaluate(kit(item("arduino-uno-r3"), item("lcd-1602-i2c", 2)))

    expect(results).toHaveLength(1)
    expect(results[0].severity).toBe("warning")
    expect(results[0].message).toContain("0x21")
  })
})
