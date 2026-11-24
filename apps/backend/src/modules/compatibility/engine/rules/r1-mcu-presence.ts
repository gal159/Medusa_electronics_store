import { LED_DIMMER_HANDLE, LED_PIXEL_CONTROLLER_HANDLE } from "../catalog-handles"
import type { CompatibilityRule, KitItemSnapshot, KitSnapshot, RuleResult } from "../types"

/**
 * R1. Valdiklio buvimas.
 *
 * Rinkiniui reikia ką nors valdančio įrenginio:
 *  - mikrovaldiklio plokštės (`mcu_board`), arba
 *  - paruošto LED valdiklio (`led_controller`), jei visi kiti komponentai
 *    yra LED juostos, maitinimas ar priedai (jutikliams, ekranams, ryšio
 *    moduliams ir ne LED pavaroms būtinas programuojamas MCU).
 * Nėra nieko → klaida. Kai rinkinyje tik LED juostos (ir maitinimas, priedai),
 * siūlomas LED valdiklis, o ne MCU: vienos spalvos juostai – dimeris,
 * adresuojamai – SP110E. Daugiau nei viena MCU plokštė → įspėjimas, nes kitos
 * taisyklės bėgelius ir kontaktus skaičiuoja bendrai.
 */

/** Ar komponentui būtinas programuojamas mikrovaldiklis. */
export function needsMcu(item: KitItemSnapshot): boolean {
  const { category, attributes, interfaces } = item.spec
  if (category === "sensor" || category === "display" || category === "communication") {
    return true
  }
  // LED juostas gali valdyti ir LED valdiklis; kitas pavaras (servo, relė) – tik MCU
  return category === "actuator" && !attributes?.ledProtocol && interfaces.length > 0
}

export const r1McuPresence: CompatibilityRule = {
  id: "R1",
  name: "Valdiklio buvimas",
  description:
    "Rinkinyje turi būti mikrovaldiklio plokštė arba (tik LED rinkiniui) LED valdiklis; kelios MCU plokštės pažymimos įspėjimu.",

  evaluate(kit: KitSnapshot): RuleResult[] {
    const mcus = kit.items.filter((item) => item.spec.category === "mcu_board")
    const ledControllers = kit.items.filter((item) => item.spec.category === "led_controller")

    if (mcus.length === 0) {
      const requiringMcu = kit.items.filter(needsMcu)

      if (ledControllers.length && !requiringMcu.length) {
        return []
      }

      if (ledControllers.length) {
        return [
          {
            ruleId: this.id,
            severity: "error",
            message: `LED valdiklis negali valdyti: ${requiringMcu.map((item) => `„${item.spec.title}“`).join(", ")}.`,
            explanation:
              "Paruoštas LED valdiklis valdo tik LED juostas. Jutikliams, ekranams ir kitoms pavaroms reikia programuojamo mikrovaldiklio, kuris nuskaito jų signalus ir pagal juos valdo juostą.",
            involvedItemIds: [
              ...requiringMcu.map((item) => item.itemId),
              ...ledControllers.map((item) => item.itemId),
            ],
            suggestion: {
              text: "Pridėkite mikrovaldiklį (pvz., ESP32 DevKit) arba pašalinkite komponentus, kuriems jo reikia.",
              productHandle: "esp32-devkit-v1",
            },
          },
        ]
      }

      const strips = kit.items.filter((item) => item.spec.attributes?.ledProtocol)
      if (strips.length && !requiringMcu.length) {
        const onlySingleColor = strips.every((strip) => strip.spec.attributes!.ledProtocol === "single_color")
        return [
          {
            ruleId: this.id,
            severity: "error",
            message: "LED juostai nėra valdiklio.",
            explanation: onlySingleColor
              ? "Vienos spalvos juostos ryškumą reguliuoja dimeris, per kurį teka juostos srovė. Mikrovaldiklio tokiam rinkiniui nereikia."
              : "Adresuojamą juostą valdo LED valdiklis (spalvos ir efektai per programėlę) arba mikrovaldiklis, jei efektus norite programuoti patys.",
            involvedItemIds: strips.map((strip) => strip.itemId),
            suggestion: onlySingleColor
              ? { text: "Pridėkite vienos spalvos LED dimerį – mikrovaldiklio nereikia.", productHandle: LED_DIMMER_HANDLE }
              : {
                  text: "Pridėkite LED valdiklį SP110E arba mikrovaldiklį (pvz., ESP32), jei efektus programuosite patys.",
                  productHandle: LED_PIXEL_CONTROLLER_HANDLE,
                },
          },
        ]
      }

      return [
        {
          ruleId: this.id,
          severity: "error",
          message: "Rinkinyje nėra mikrovaldiklio plokštės.",
          explanation:
            "Jutikliai, ekranai ir pavaros patys neveikia: juos valdo mikrovaldiklis, kuris taip pat suteikia maitinimo bėgelius ir sąsajas. Pridėkite ESP32, Arduino ar Raspberry Pi Pico tipo plokštę.",
          involvedItemIds: [],
          suggestion: {
            text: "Pradedantiesiems tinka Arduino Uno R3 (5 V) arba ESP32 DevKit (3,3 V, Wi-Fi).",
            productHandle: "arduino-uno-r3",
          },
        },
      ]
    }

    const totalMcuUnits = mcus.reduce((sum, item) => sum + item.quantity, 0)
    if (totalMcuUnits > 1) {
      return [
        {
          ruleId: this.id,
          severity: "warning",
          message: `Rinkinyje yra ${totalMcuUnits} mikrovaldiklio plokštės.`,
          explanation:
            "Patikra laiko, kad visi komponentai jungiami prie vienos plokštės. Jei projekte kelios plokštės veikia atskirai, kiekvienai sukonfigūruokite atskirą rinkinį, kad srovės ir kontaktų skaičiavimai būtų tikslūs.",
          involvedItemIds: mcus.map((item) => item.itemId),
        },
      ]
    }

    return []
  },
}
