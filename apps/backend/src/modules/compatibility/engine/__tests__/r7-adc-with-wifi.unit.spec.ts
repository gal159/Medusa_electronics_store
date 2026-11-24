import { r7AdcWithWifi } from "../rules/r7-adc-with-wifi"
import { item, kit } from "./kit-fixtures"

/** Kataloge analoginių jutiklių dar nėra, todėl naudojamas sintetinis `analog_in` jutiklis. */
const analogSensor = (quantity: number) =>
  item("bh1750", quantity, { spec: { interfaces: [{ type: "analog_in", pinCount: 1 }] } })

describe("R7 Analoginiai įėjimai su Wi-Fi", () => {
  it("įspėjimas: ESP32 su 9 analoginiais jutikliais (ADC1 turi 8, iš viso 18)", () => {
    const results = r7AdcWithWifi.evaluate(kit(item("esp32-devkit-v1"), analogSensor(9)))

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ ruleId: "R7", severity: "warning" })
    expect(results[0].message).toContain("9")
    expect(results[0].message).toContain("8")
  })

  it("be pastabų: 8 analoginiai jutikliai telpa į ADC1", () => {
    expect(r7AdcWithWifi.evaluate(kit(item("esp32-devkit-v1"), analogSensor(8)))).toEqual([])
  })

  it("tyli, kai poreikis viršija visus ADC: tai R6 klaida, ne R7", () => {
    expect(r7AdcWithWifi.evaluate(kit(item("esp32-devkit-v1"), analogSensor(19)))).toEqual([])
  })

  it("netaikoma plokštėms be Wi-Fi (Uno)", () => {
    expect(r7AdcWithWifi.evaluate(kit(item("arduino-uno-r3"), analogSensor(5)))).toEqual([])
  })
})
