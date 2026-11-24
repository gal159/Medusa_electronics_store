import { r2SupplyVoltage } from "../rules/r2-supply-voltage"
import { item, kit } from "./kit-fixtures"

describe("R2 Maitinimo įtampa", () => {
  it("tyli, kai rinkinys neturi bėgelių (tai R1 atsakomybė)", () => {
    expect(r2SupplyVoltage.evaluate(kit(item("hc-sr04")))).toEqual([])
  })

  it("ESP32 (3V3 ir 5V bėgeliai) maitina ir 3,3 V BME280, ir 5 V HC-SR04", () => {
    const results = r2SupplyVoltage.evaluate(
      kit(item("esp32-devkit-v1"), item("bme280-modulis-3v3"), item("hc-sr04"))
    )
    expect(results).toEqual([])
  })

  it("Uno 3V3 bėgelis tinka nRF24L01+ (1,9–3,6 V)", () => {
    expect(r2SupplyVoltage.evaluate(kit(item("arduino-uno-r3"), item("nrf24l01-plus")))).toEqual([])
  })

  it("klaida: BME280 (max 3,6 V) tiesiai iš Li-ion 3,7 V bėgelio", () => {
    const results = r2SupplyVoltage.evaluate(
      kit(item("18650-laikiklis-tp4056"), item("bme280-modulis-3v3"))
    )

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      ruleId: "R2",
      severity: "error",
      involvedItemIds: ["item_bme280-modulis-3v3"],
    })
    expect(results[0].message).toContain("3,7 V")
    expect(results[0].suggestion?.productHandle).toBe("mb102-breadboard-maitinimas")
  })

  it("klaida: HC-SR04 (5 V) rinkinyje, kurio vienintelis bėgelis 3,7 V", () => {
    const results = r2SupplyVoltage.evaluate(kit(item("18650-laikiklis-tp4056"), item("hc-sr04")))
    expect(results.map((result) => result.severity)).toEqual(["error"])
  })

  it("klaida: 12 V COB juosta su 5 V šaltiniu, kurio niekas kitas nenaudoja – siūloma jį pakeisti 12 V", () => {
    const results = r2SupplyVoltage.evaluate(
      kit(item("led-maitinimo-saltinis-5v"), item("cob-juosta-12v", 2))
    )

    expect(results).toHaveLength(1)
    expect(results[0].involvedItemIds).toEqual(["item_cob-juosta-12v", "item_led-maitinimo-saltinis-5v"])
    expect(results[0].suggestion).toMatchObject({
      productHandle: "led-maitinimo-saltinis-12v",
      replaceItemId: "item_led-maitinimo-saltinis-5v",
    })
  })

  it("dimeris (5–36 V) ant 5 V šaltinio netrukdo keisti šaltinio į 24 V", () => {
    const results = r2SupplyVoltage.evaluate(
      kit(item("led-maitinimo-saltinis-5v"), item("led-dimeris-vienos-spalvos"), item("cob-juosta-24v", 3))
    )
    expect(results).toHaveLength(1)
    expect(results[0].suggestion).toMatchObject({
      productHandle: "led-maitinimo-saltinis-24v",
      replaceItemId: "item_led-maitinimo-saltinis-5v",
    })
  })

  it("WS2812B (iki 5,3 V) lieka ant 5 V šaltinio, todėl 12 V šaltinis siūlomas pridėti, ne keisti", () => {
    const results = r2SupplyVoltage.evaluate(
      kit(item("led-maitinimo-saltinis-5v"), item("ws2812b-juosta-1m"), item("cob-juosta-12v"))
    )
    expect(results).toHaveLength(1)
    expect(results[0].suggestion?.productHandle).toBe("led-maitinimo-saltinis-12v")
    expect(results[0].suggestion?.replaceItemId).toBeUndefined()
  })

  it("12 V juosta su Uno bėgeliais (3V3, 5V): MB102 nesiūlomas, nes jo bėgeliai irgi 3,3 / 5 V", () => {
    const results = r2SupplyVoltage.evaluate(kit(item("arduino-uno-r3"), item("cob-juosta-12v")))
    expect(results[0].suggestion?.productHandle).toBe("led-maitinimo-saltinis-12v")
  })

  it("priedai ir pasyvūs komponentai netikrinami", () => {
    const results = r2SupplyVoltage.evaluate(
      kit(item("18650-laikiklis-tp4056"), item("breadboard-830"), item("rezistoriu-rinkinys-600"))
    )
    expect(results).toEqual([])
  })

  it("gerbia naudotojo priskirtą bėgelį, net jei jis netinka", () => {
    const results = r2SupplyVoltage.evaluate(
      kit(item("esp32-devkit-v1"), item("hc-sr04", 1, { assignedRailLabel: "3V3" }))
    )
    expect(results).toEqual([])
  })
})
