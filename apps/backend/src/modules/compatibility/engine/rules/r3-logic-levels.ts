import { LEVEL_SHIFTER_HANDLE, LEVEL_SHIFTER_HANDLES } from "../catalog-handles"
import { formatVolts } from "../rails"
import type { CompatibilityRule, KitItemSnapshot, KitSnapshot, RuleResult } from "../types"

/**
 * R3. Loginiai lygiai.
 *
 * a) Komponentas išveda aukštesnį lygį nei MCU GPIO toleruoja (pvz., HC-SR04
 *    ECHO 5 V į ESP32 3,3 V GPIO, kurio absoliutus maksimumas 3,6 V) → klaida.
 * b) MCU išveda aukštesnį lygį nei komponento įėjimai toleruoja (pvz., Uno 5 V
 *    SDA/SCL į BME280, kurio VDDIO max 3,6 V) → klaida.
 * c) MCU išveda žemesnį lygį nei komponento VIH min (pvz., ESP32 3,3 V į
 *    WS2812B DIN, kuriam reikia ≥ 0,7·VDD = 3,5 V prie 5 V) → įspėjimas:
 *    dažnai veikia, bet už specifikacijos ribų.
 *
 * Lyginama su tolerancija, kad 3.3 vs 3.3 ar 5 vs 5 nebūtų laikomi skirtingais.
 */
const VOLTAGE_TOLERANCE_V = 0.05

export { LEVEL_SHIFTER_HANDLE }

/**
 * Kai rinkinyje yra lygių keitiklis, lygių neatitikimas tampa `info`
 * („veskite signalą per keitiklį“) vietoj `error`, kitaip pasiūlymas pridėti
 * keitiklį niekada nepašalintų klaidos.
 */
function hasDigitalSignalToMcu(item: KitItemSnapshot): boolean {
  return item.spec.interfaces.some((iface) => iface.type !== "analog_in")
}

function kitHasLevelShifter(kit: KitSnapshot): boolean {
  return kit.items.some((item) => LEVEL_SHIFTER_HANDLES.includes(item.spec.productHandle))
}

export const r3LogicLevels: CompatibilityRule = {
  id: "R3",
  name: "Loginiai lygiai",
  description:
    "Komponento signalų lygis turi atitikti mikrovaldiklio GPIO lygį abiem kryptimis: į MCU ir iš MCU.",

  evaluate(kit: KitSnapshot): RuleResult[] {
    const mcus = kit.items.filter((item) => item.spec.category === "mcu_board" && item.spec.mcu)
    const peripherals = kit.items.filter(
      (item) => item.spec.category !== "mcu_board" && hasDigitalSignalToMcu(item)
    )

    const results: RuleResult[] = []
    const hasShifter = kitHasLevelShifter(kit)
    // Su keitikliu rinkinyje neatitikimas lieka matomas, bet neblokuoja užsakymo.
    const mismatchSeverity = hasShifter ? "info" : "error"
    const shifterSuggestion = hasShifter
      ? { text: "Rinkinyje yra lygių keitiklis: šį signalą junkite per jį." }
      : undefined

    for (const mcuItem of mcus) {
      const mcu = mcuItem.spec.mcu!
      for (const item of peripherals) {
        const { logicVoltageV, inputHighMinV, isFiveVoltTolerant, title, datasheetUrl } =
          item.spec

        const mcuDrivesTooHigh =
          logicVoltageV !== null &&
          mcu.ioVoltageV > logicVoltageV + VOLTAGE_TOLERANCE_V &&
          !isFiveVoltTolerant

        if (mcuDrivesTooHigh) {
          results.push({
            ruleId: this.id,
            severity: mismatchSeverity,
            message: `„${mcuItem.spec.title}“ GPIO yra ${formatVolts(mcu.ioVoltageV)}, o „${title}“ įėjimai skirti ${formatVolts(logicVoltageV)} ir netoleruoja aukštesnės įtampos.`,
            explanation:
              "Mikrovaldiklio išėjimo įtampa viršija komponento sąsajos ribas: tai gali sugadinti komponento įėjimus arba sutrumpinti jo tarnavimo laiką. Signalus iš mikrovaldiklio į komponentą reikia leisti per lygių keitiklį.",
            involvedItemIds: [item.itemId, mcuItem.itemId],
            suggestion: shifterSuggestion ?? {
              text: "Pridėkite dvikryptį loginių lygių keitiklį (BSS138) tarp mikrovaldiklio ir komponento.",
              productHandle: LEVEL_SHIFTER_HANDLE,
            },
            source: datasheetUrl,
          })
          continue
        }

        const drivesTooHigh =
          logicVoltageV !== null &&
          logicVoltageV > mcu.ioVoltageV + VOLTAGE_TOLERANCE_V &&
          !mcu.isFiveVoltTolerant

        if (drivesTooHigh) {
          results.push({
            ruleId: this.id,
            severity: mismatchSeverity,
            message: `„${title}“ išveda ${formatVolts(logicVoltageV)} signalą, o „${mcuItem.spec.title}“ GPIO yra ${formatVolts(mcu.ioVoltageV)} ir netoleruoja aukštesnės įtampos.`,
            explanation:
              "Aukštesnė nei leidžiama įėjimo įtampa viršija mikrovaldiklio absoliučias ribas ir gali sugadinti GPIO. Reikia loginių lygių keitiklio arba įtampos daliklio ant signalo linijos.",
            involvedItemIds: [item.itemId, mcuItem.itemId],
            suggestion: shifterSuggestion ?? {
              text: "Pridėkite dvikryptį loginių lygių keitiklį (BSS138) tarp komponento ir mikrovaldiklio.",
              productHandle: LEVEL_SHIFTER_HANDLE,
            },
            source: mcuItem.spec.datasheetUrl,
          })
          continue
        }

        const mcuTooLowForInput =
          inputHighMinV !== null && mcu.ioVoltageV + VOLTAGE_TOLERANCE_V < inputHighMinV

        if (mcuTooLowForInput) {
          results.push({
            ruleId: this.id,
            severity: "warning",
            message: `„${mcuItem.spec.title}“ ${formatVolts(mcu.ioVoltageV)} signalas gali būti per žemas „${title}“ įėjimui (reikia ≥ ${formatVolts(inputHighMinV)}).`,
            explanation:
              "Komponentas gali neatpažinti mikrovaldiklio „1“ lygio: veikimas nepatikimas, ypač ilgesniais laidais. Patikimam darbui naudokite lygių keitiklį į komponento maitinimo įtampą.",
            involvedItemIds: [item.itemId, mcuItem.itemId],
            suggestion: {
              text: "Lygių keitiklis pakels valdymo signalą iki komponento loginio lygio.",
              productHandle: LEVEL_SHIFTER_HANDLE,
            },
            source: datasheetUrl,
          })
        }
      }
    }

    return results
  },
}
