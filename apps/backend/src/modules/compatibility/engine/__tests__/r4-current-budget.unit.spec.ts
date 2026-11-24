import { EXTERNAL_POWER_HANDLE, r4CurrentBudget } from "../rules/r4-current-budget"
import { item, kit } from "./kit-fixtures"

describe("R4 Srovės biudžetas", () => {
  it("be pastabų: Uno 5V (USB 500 mA) su vienu 28BYJ-48 (215 mA)", () => {
    const results = r4CurrentBudget.evaluate(kit(item("arduino-uno-r3"), item("28byj-48-uln2003")))
    expect(results).toEqual([])
  })

  it("įspėjimas: du 28BYJ-48 iš USB = 430 mA (86 %)", () => {
    const results = r4CurrentBudget.evaluate(kit(item("arduino-uno-r3"), item("28byj-48-uln2003", 2)))

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ ruleId: "R4", severity: "warning" })
    expect(results[0].message).toContain("86 %")
  })

  it("klaida: trys 28BYJ-48 iš USB = 645 mA > 500 mA, siūlomas išorinis maitinimas", () => {
    const results = r4CurrentBudget.evaluate(kit(item("arduino-uno-r3"), item("28byj-48-uln2003", 3)))

    expect(results).toHaveLength(1)
    expect(results[0].severity).toBe("error")
    expect(results[0].involvedItemIds).toEqual(["item_28byj-48-uln2003", "item_arduino-uno-r3"])
    expect(results[0].suggestion?.productHandle).toBe(EXTERNAL_POWER_HANDLE)
  })

  it("skaičiuoja kiekvieną bėgelį atskirai: Pico 3V3 300 mA ir VBUS 500 mA", () => {
    // nRF24L01+ (13,5 mA) ir BME280 (0,7 mA) į 3V3; du 28BYJ-48 (430 mA) į VBUS 5 V
    const results = r4CurrentBudget.evaluate(
      kit(
        item("raspberry-pi-pico"),
        item("nrf24l01-plus"),
        item("bme280-modulis-3v3"),
        item("28byj-48-uln2003", 2)
      )
    )

    expect(results).toHaveLength(1)
    expect(results[0].severity).toBe("warning")
    expect(results[0].message).toContain("VBUS")
  })

  it("info: komponentai su nežinoma srove išvardijami, o ne ignoruojami tyliai", () => {
    const results = r4CurrentBudget.evaluate(kit(item("arduino-uno-r3"), item("sg90-servo", 3)))

    expect(results).toHaveLength(1)
    expect(results[0].severity).toBe("info")
    expect(results[0].message).toContain("sg90-servo")
  })

  it("bėgelis su nežinoma riba netikrinamas (ESP32 3V3)", () => {
    const results = r4CurrentBudget.evaluate(kit(item("esp32-devkit-v1"), item("nrf24l01-plus", 20)))
    expect(results).toEqual([])
  })

  it("be bėgelių taisyklė tyli", () => {
    expect(r4CurrentBudget.evaluate(kit(item("28byj-48-uln2003", 5)))).toEqual([])
  })
})
