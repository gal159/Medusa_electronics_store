import { evaluateKit } from "../../modules/compatibility/engine"
import { applyVariantOverrides } from "../../modules/compatibility/snapshot"
import { item, kit, specOf, type Handle } from "../../modules/compatibility/engine/__tests__/kit-fixtures"
import { COMPONENT_SPECS } from "../component-spec-data"
import { KIT_PRESETS } from "../kit-presets"

/** Maitinimo šaltinio varianto srovė iš pavadinimo („6 A“, „6,2 A / 150 W“) testams. */
function railMaFromTitle(title: string): number {
  return Math.round(Number(title.split(" ")[0].replace(",", ".")) * 1000)
}

function defaultKit(presetId: string) {
  const preset = KIT_PRESETS.find((candidate) => candidate.id === presetId)!
  return kit(
    ...preset.slots
      .filter((slot) => slot.default)
      .map((slot) => {
        const { handle, variantTitle, quantity } = slot.default!
        const spec = variantTitle
          ? applyVariantOverrides(specOf(handle as Handle), {
              title: variantTitle,
              metadata: { rail_max_current_ma: railMaFromTitle(variantTitle) },
            })
          : specOf(handle as Handle)
        return item(handle as Handle, quantity ?? 1, { spec })
      })
  )
}

describe("Rinkinių šablonai", () => {
  it("visos šablonų prekės turi technines specifikacijas", () => {
    const handles = KIT_PRESETS.flatMap((preset) => preset.slots.flatMap((slot) => slot.allowedHandles))
    expect(handles.filter((handle) => !COMPONENT_SPECS[handle])).toEqual([])
  })

  it("numatytasis LED rinkinys (5 V 6 A, Uno, 2 m WS2812B) neturi klaidų ir įspėjimų", () => {
    const report = evaluateKit(defaultKit("led-rinkinys"))

    expect(report.summary.errors).toBe(0)
    expect(report.summary.warnings).toBe(0)
  })

  it("numatytasis rinkinys su 4 m juostos: šaltinis persilpnas (8 800 > 6 000 mA)", () => {
    const base = defaultKit("led-rinkinys")
    const longer = kit(
      ...base.items.map((entry) =>
        entry.spec.productHandle === "ws2812b-juosta-1m" ? { ...entry, quantity: 4 } : entry
      )
    )

    const r4 = evaluateKit(longer).results.find((result) => result.ruleId === "R4" && result.severity === "error")
    expect(r4?.message).toContain("persilpnas")
  })
})
