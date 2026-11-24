import { evaluateKit } from "../engine"
import { ALL_RULES } from "../rules"
import type { CompatibilityRule } from "../types"
import { item, kit } from "./kit-fixtures"

describe("evaluateKit", () => {
  it("scenarijus 1: Pico + BME280 + SSD1306 be klaidų ir užsakomas", () => {
    const report = evaluateKit(
      kit(item("raspberry-pi-pico"), item("bme280-modulis-3v3"), item("ssd1306-oled-0-96"))
    )

    expect(report.summary.errors).toBe(0)
    expect(report.isOrderable).toBe(true)
    expect(report.evaluatedRuleIds).toEqual(["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9"])
  })

  it("scenarijus 2: ESP32 + HC-SR04 turi R3 klaidą ir nėra užsakomas", () => {
    const report = evaluateKit(kit(item("esp32-devkit-v1"), item("hc-sr04")))

    expect(report.isOrderable).toBe(false)
    expect(report.results.map((result) => result.ruleId)).toContain("R3")
  })

  it("scenarijus 6: rinkinys be MCU turi tik R1 klaidą", () => {
    const report = evaluateKit(kit(item("hc-sr04"), item("sg90-servo")))

    expect(report.results.map((result) => result.ruleId)).toEqual(["R1"])
    expect(report.summary).toEqual({ errors: 1, warnings: 0, infos: 0 })
  })

  it("rikiuoja rezultatus: klaidos, įspėjimai, informacija", () => {
    // R1 warning (2 MCU), R3 error (HC-SR04 į ESP32), R4 info (SG90 srovė nežinoma)
    const report = evaluateKit(
      kit(item("esp32-devkit-v1"), item("arduino-uno-r3"), item("hc-sr04"), item("sg90-servo"))
    )

    const severities = report.results.map((result) => result.severity)
    expect(severities).toEqual([...severities].sort((a, b) => order(a) - order(b)))
    expect(severities[0]).toBe("error")
    expect(severities[severities.length - 1]).toBe("info")
  })

  it("leidžia pasirinkti taisyklių poaibį", () => {
    const report = evaluateKit(kit(item("esp32-devkit-v1"), item("hc-sr04")), [ALL_RULES[0]])

    expect(report.evaluatedRuleIds).toEqual(["R1"])
    expect(report.results).toEqual([])
  })

  it("nauja taisyklė prijungiama be variklio pakeitimų", () => {
    const alwaysInfo: CompatibilityRule = {
      id: "R99",
      name: "Testinė",
      description: "Visada grąžina info",
      evaluate: () => [
        {
          ruleId: "R99",
          severity: "info",
          message: "ok",
          explanation: "testas",
          involvedItemIds: [],
        },
      ],
    }

    // Uno vienas negauna jokių R1–R8 pastabų, todėl lieka tik R99 rezultatas
    const report = evaluateKit(kit(item("arduino-uno-r3")), [...ALL_RULES, alwaysInfo])
    expect(report.summary.infos).toBe(1)
    expect(report.isOrderable).toBe(true)
  })
})

function order(severity: string): number {
  return { error: 0, warning: 1, info: 2 }[severity] ?? 99
}
