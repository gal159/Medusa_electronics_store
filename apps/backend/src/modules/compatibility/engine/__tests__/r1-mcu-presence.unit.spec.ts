import { r1McuPresence } from "../rules/r1-mcu-presence"
import { item, kit } from "./kit-fixtures"

describe("R1 Mikrovaldiklio buvimas", () => {
  it("klaida, kai rinkinyje nėra MCU plokštės", () => {
    const results = r1McuPresence.evaluate(kit(item("bme280-modulis-3v3"), item("ssd1306-oled-0-96")))

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ ruleId: "R1", severity: "error" })
    expect(results[0].suggestion?.productHandle).toBe("arduino-uno-r3")
  })

  it("be pastabų, kai yra lygiai viena MCU plokštė", () => {
    expect(r1McuPresence.evaluate(kit(item("esp32-devkit-v1"), item("hc-sr04")))).toEqual([])
  })

  it("įspėjimas, kai MCU plokščių daugiau nei viena (dvi skirtingos)", () => {
    const results = r1McuPresence.evaluate(kit(item("esp32-devkit-v1"), item("arduino-uno-r3")))

    expect(results).toHaveLength(1)
    expect(results[0].severity).toBe("warning")
    expect(results[0].involvedItemIds).toEqual(["item_esp32-devkit-v1", "item_arduino-uno-r3"])
  })

  it("įspėjimas, kai tos pačios plokštės kiekis > 1", () => {
    const results = r1McuPresence.evaluate(kit(item("raspberry-pi-pico", 2)))

    expect(results[0].severity).toBe("warning")
    expect(results[0].message).toContain("2")
  })
})
