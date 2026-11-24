import { r1McuPresence } from "../rules/r1-mcu-presence"
import { r9LedControl } from "../rules/r9-led-control"
import { item, kit } from "./kit-fixtures"

describe("R9 LED juostos valdymas", () => {
  it("adresuojamą WS2812B juostą valdo SP110E: be pastabų", () => {
    expect(r9LedControl.evaluate(kit(item("sp110e-led-valdiklis"), item("ws2812b-juosta-1m", 2)))).toEqual([])
  })

  it("adresuojamą WS2811 juostą valdo mikrovaldiklis: be pastabų", () => {
    expect(r9LedControl.evaluate(kit(item("esp32-devkit-v1"), item("ws2811-juosta-12v", 3)))).toEqual([])
  })

  it("klaida: COB juosta tik su Uno, kuriam kito darbo nėra – siūloma Uno pakeisti dimeriu", () => {
    const results = r9LedControl.evaluate(kit(item("arduino-uno-r3"), item("cob-juosta-12v", 2)))

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ ruleId: "R9", severity: "error" })
    expect(results[0].involvedItemIds).toEqual(["item_cob-juosta-12v", "item_arduino-uno-r3"])
    expect(results[0].suggestion).toMatchObject({
      productHandle: "led-dimeris-vienos-spalvos",
      replaceItemId: "item_arduino-uno-r3",
    })
    expect(results[0].suggestion?.text).toContain("užtenka dimerio")
  })

  it("klaida: COB juosta su ESP32 ir PIR jutikliu – MCU reikalingas, todėl dimeris pridedamas, ne keičiamas", () => {
    const results = r9LedControl.evaluate(
      kit(item("esp32-devkit-v1"), item("pir-hc-sr501"), item("cob-juosta-12v", 2))
    )

    expect(results).toHaveLength(1)
    expect(results[0].suggestion?.productHandle).toBe("led-dimeris-vienos-spalvos")
    expect(results[0].suggestion?.replaceItemId).toBeUndefined()
  })

  it("klaida: COB ir WS2812B juostos su Uno – Uno reikia adresuojamai juostai, todėl nekeičiamas", () => {
    const results = r9LedControl.evaluate(
      kit(item("arduino-uno-r3"), item("ws2812b-juosta-1m"), item("cob-juosta-12v"))
    )

    expect(results).toHaveLength(1)
    expect(results[0].suggestion?.replaceItemId).toBeUndefined()
  })

  it("klaida: COB juosta su adresuojamų juostų valdikliu (protokolas nepalaikomas)", () => {
    const results = r9LedControl.evaluate(kit(item("sp110e-led-valdiklis"), item("cob-juosta-24v")))
    expect(results.map((result) => result.severity)).toEqual(["error"])
  })

  // Light plan 3007: maks. apkrova 96 W / 12 V = 8 A; 12 V COB 480 LED/m – 11 W/m → 917 mA/m
  it("dimeris 8 A: 8 m 12 V COB (7 336 mA) telpa, 9 m (8 253 mA) – perkrova", () => {
    expect(r9LedControl.evaluate(kit(item("led-dimeris-vienos-spalvos"), item("cob-juosta-12v", 8)))).toEqual([])

    const results = r9LedControl.evaluate(kit(item("led-dimeris-vienos-spalvos"), item("cob-juosta-12v", 9)))
    expect(results).toHaveLength(1)
    expect(results[0].message).toContain("perkrautas")
    expect(results[0].message).toMatch(/8\s000 mA/)
  })

  it("dimeris su 24 V COB: 14 m (7 588 mA) telpa", () => {
    expect(r9LedControl.evaluate(kit(item("led-dimeris-vienos-spalvos"), item("cob-juosta-24v", 14)))).toEqual([])
  })

  it("be jokio valdiklio tyli (tai R1 klaida)", () => {
    expect(r9LedControl.evaluate(kit(item("ws2812b-juosta-1m")))).toEqual([])
  })
})

describe("R1 su LED valdikliu", () => {
  it("tik vienos spalvos juosta ir šaltinis: siūlomas dimeris, ne mikrovaldiklis", () => {
    const results = r1McuPresence.evaluate(kit(item("cob-juosta-12v", 3), item("led-maitinimo-saltinis-12v")))

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ ruleId: "R1", severity: "error", message: "LED juostai nėra valdiklio." })
    expect(results[0].suggestion?.productHandle).toBe("led-dimeris-vienos-spalvos")
  })

  it("tik adresuojama juosta ir šaltinis: siūlomas SP110E", () => {
    const results = r1McuPresence.evaluate(kit(item("ws2812b-juosta-1m", 2), item("led-maitinimo-saltinis-5v")))
    expect(results[0].suggestion?.productHandle).toBe("sp110e-led-valdiklis")
  })

  it("dimeris + vienos spalvos juosta be MCU – be klaidos", () => {
    expect(
      r1McuPresence.evaluate(kit(item("led-dimeris-vienos-spalvos"), item("cob-juosta-24v", 5), item("led-maitinimo-saltinis-24v")))
    ).toEqual([])
  })

  it("LED rinkinys be MCU: SP110E + WS2812B + 5 V šaltinis – be klaidos", () => {
    const results = r1McuPresence.evaluate(
      kit(item("sp110e-led-valdiklis"), item("ws2812b-juosta-1m"), item("led-maitinimo-saltinis-5v"))
    )
    expect(results).toEqual([])
  })

  it("klaida: LED valdiklis + PIR jutiklis be MCU", () => {
    const results = r1McuPresence.evaluate(
      kit(item("sp110e-led-valdiklis"), item("ws2812b-juosta-1m"), item("pir-hc-sr501"))
    )

    expect(results).toHaveLength(1)
    expect(results[0].severity).toBe("error")
    expect(results[0].involvedItemIds).toContain("item_pir-hc-sr501")
    expect(results[0].suggestion?.productHandle).toBe("esp32-devkit-v1")
  })
})
