import { evaluateKit } from "../engine"
import { item, kit } from "./kit-fixtures"
import { REFERENCE_KITS, type ExpectedFinding } from "./reference-kits"

/** Unikalūs (taisyklė, sunkumas) poros, kad keli vienodi rezultatai skaičiuotųsi kartą. */
function findingKeys(findings: ExpectedFinding[]): Set<string> {
  return new Set(findings.map((finding) => `${finding.ruleId}:${finding.severity}`))
}

function actualFindings(items: Parameters<typeof item>[]): ExpectedFinding[] {
  const report = evaluateKit(kit(...items.map((args) => item(...args))))
  return report.results
    .filter((result) => result.severity !== "info")
    .map((result) => ({ ruleId: result.ruleId, severity: result.severity as ExpectedFinding["severity"] }))
}

describe("Etaloniniai rinkiniai (5 uždavinys: patikros teisingumas)", () => {
  it.each(REFERENCE_KITS.map((ref) => [ref.id, ref] as const))("%s", (_id, ref) => {
    const actual = findingKeys(actualFindings(ref.items))
    const expected = findingKeys(ref.expected)

    expect([...actual].sort()).toEqual([...expected].sort())
  })

  it("suvestinė: tikslumas 100 %, be klaidingai teigiamų ir neigiamų", () => {
    let truePositives = 0
    let falsePositives = 0
    let falseNegatives = 0
    let correctKits = 0

    for (const ref of REFERENCE_KITS) {
      const actual = findingKeys(actualFindings(ref.items))
      const expected = findingKeys(ref.expected)
      const tp = [...actual].filter((key) => expected.has(key)).length
      truePositives += tp
      falsePositives += actual.size - tp
      falseNegatives += expected.size - tp
      if (actual.size === tp && expected.size === tp) {
        correctKits++
      }
    }

    expect({ correctKits, totalKits: REFERENCE_KITS.length, truePositives, falsePositives, falseNegatives }).toEqual({
      correctKits: REFERENCE_KITS.length,
      totalKits: REFERENCE_KITS.length,
      truePositives: REFERENCE_KITS.reduce((sum, ref) => sum + findingKeys(ref.expected).size, 0),
      falsePositives: 0,
      falseNegatives: 0,
    })
  })
})
