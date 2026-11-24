import { evaluateKit } from "../engine"
import { item, kit, specOf } from "../engine/__tests__/kit-fixtures"
import { applyVariantOverrides } from "../snapshot"

describe("applyVariantOverrides (varianto srovė maitinimo šaltiniui)", () => {
  it("perrašo bėgelio srovės ribą ir prideda varianto pavadinimą", () => {
    const spec = applyVariantOverrides(specOf("led-maitinimo-saltinis-5v"), {
      title: "2 A",
      metadata: { rail_max_current_ma: 2000 },
    })

    expect(spec.powerRails).toEqual([{ label: "5V DC (PSU)", voltageV: 5, maxCurrentMa: 2000 }])
    expect(spec.title).toBe("led-maitinimo-saltinis-5v (2 A)")
  })

  it("„Standartinis“ variantas be metaduomenų nekeičia specifikacijos", () => {
    const original = specOf("arduino-uno-r3")
    expect(applyVariantOverrides(original, { title: "Standartinis", metadata: null })).toBe(original)
  })

  it("ignoruoja netinkamą reikšmę metaduomenyse", () => {
    const spec = applyVariantOverrides(specOf("led-maitinimo-saltinis-12v"), {
      title: "Standartinis",
      metadata: { rail_max_current_ma: "daug" },
    })
    expect(spec.powerRails[0].maxCurrentMa).toBeNull()
  })

  it("R4 su varianto srove: Uno + 3× 28BYJ-48 (645 mA) iš 5 V 2 A šaltinio – be perkrovos", () => {
    const psu2A = item("led-maitinimo-saltinis-5v", 1, {
      spec: applyVariantOverrides(specOf("led-maitinimo-saltinis-5v"), {
        title: "2 A",
        metadata: { rail_max_current_ma: 2000 },
      }),
    })
    // Varikliai priskirti PSU bėgeliui, ne Uno USB
    const motors = item("28byj-48-uln2003", 3, { assignedRailLabel: "5V DC (PSU)" })

    const report = evaluateKit(kit(item("arduino-uno-r3"), psu2A, motors))

    expect(report.results.filter((result) => result.ruleId === "R4" && result.severity !== "info")).toEqual([])
  })

  it("be rankinio priskyrimo varikliai automatiškai jungiami prie 5 V šaltinio, ne prie Uno USB", () => {
    const psu2A = item("led-maitinimo-saltinis-5v", 1, {
      spec: applyVariantOverrides(specOf("led-maitinimo-saltinis-5v"), {
        title: "2 A",
        metadata: { rail_max_current_ma: 2000 },
      }),
    })

    const report = evaluateKit(kit(item("arduino-uno-r3"), psu2A, item("28byj-48-uln2003", 3)))

    expect(report.results.filter((result) => result.ruleId === "R4" && result.severity !== "info")).toEqual([])
    expect(report.isOrderable).toBe(true)
  })

  it("R4 siūlo mažiausią pakankamą šaltinio variantą: 3 m WS2812B (6 600 mA) ant 5 V 5 A → 10 A", () => {
    const alternatives = [2, 5, 6, 8, 10].map((amps) => ({
      variantId: `variant_5v_${amps}a`,
      title: `${amps} A`,
      railMaxCurrentMa: amps * 1000,
    }))
    const psu5A = item("led-maitinimo-saltinis-5v", 1, {
      itemId: "variant_5v_5a",
      variantAlternatives: alternatives,
      spec: applyVariantOverrides(specOf("led-maitinimo-saltinis-5v"), {
        title: "5 A",
        metadata: { rail_max_current_ma: 5000 },
      }),
    })

    const r4 = evaluateKit(
      kit(item("sp110e-led-valdiklis"), psu5A, item("ws2812b-juosta-1m", 3))
    ).results.find((result) => result.ruleId === "R4" && result.severity === "error")

    // 6 600 mA: 8 A (8 000) būtų 83 % (> 80 %), todėl siūlomas 10 A
    expect(r4?.message).toContain("persilpnas")
    expect(r4?.suggestion).toMatchObject({
      replaceItemId: "variant_5v_5a",
      replaceWithVariantId: "variant_5v_10a",
    })
  })

  it("R4: kai joks šaltinio variantas nepakankamas, siūloma dalinti apkrovą (ne MB102)", () => {
    const psu = item("led-maitinimo-saltinis-5v", 1, {
      itemId: "variant_5v_10a",
      variantAlternatives: [{ variantId: "variant_5v_10a", title: "10 A", railMaxCurrentMa: 10000 }],
      spec: applyVariantOverrides(specOf("led-maitinimo-saltinis-5v"), {
        title: "10 A",
        metadata: { rail_max_current_ma: 10000 },
      }),
    })

    const r4 = evaluateKit(kit(item("sp110e-led-valdiklis"), psu, item("ws2812b-juosta-1m", 6))).results.find(
      (result) => result.ruleId === "R4" && result.severity === "error"
    )

    expect(r4?.suggestion?.replaceWithVariantId).toBeUndefined()
    expect(r4?.suggestion?.productHandle).toBeUndefined()
    expect(r4?.suggestion?.text).toContain("12 V / 24 V")
  })

  it("R4 su varianto srove: 10× 28BYJ-48 (2150 mA) iš 5 V 2 A šaltinio – klaida su varianto pavadinimu", () => {
    const psu2A = item("led-maitinimo-saltinis-5v", 1, {
      spec: applyVariantOverrides(specOf("led-maitinimo-saltinis-5v"), {
        title: "2 A",
        metadata: { rail_max_current_ma: 2000 },
      }),
    })
    const motors = item("28byj-48-uln2003", 10, { assignedRailLabel: "5V DC (PSU)" })

    const r4 = evaluateKit(kit(item("esp32-devkit-v1"), psu2A, motors)).results.find(
      (result) => result.ruleId === "R4" && result.severity === "error"
    )

    expect(r4?.message).toContain("(2 A)")
    // lt-LT formatas: tūkstančiai atskiriami tarpu („2 150 mA“)
    expect(r4?.message).toContain("persilpnas")
    expect(r4?.message).toMatch(/reikia 2\s150 mA, o jis duoda 2\s000 mA/)
  })
})
