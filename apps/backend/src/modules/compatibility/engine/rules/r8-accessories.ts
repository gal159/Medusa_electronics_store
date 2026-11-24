import {
  BREADBOARD_HANDLE,
  JUMPER_WIRES_HANDLE,
  MICRO_USB_BOARD_HANDLES,
  USB_CABLE_HANDLE,
} from "../catalog-handles"
import type { CompatibilityRule, KitSnapshot, RuleResult } from "../types"

/**
 * R8. Priedai.
 * Informacinė taisyklė pradedantiesiems: rinkinys su MCU ir bent vienu
 * periferiniu komponentu paprastai neveiks be maketavimo plokštės ir laidų,
 * o Micro-USB plokštėms reikia duomenų kabelio. Niekada neblokuoja užsakymo.
 */
export const r8Accessories: CompatibilityRule = {
  id: "R8",
  name: "Priedai",
  description:
    "Primena apie maketavimo plokštę, jungiamuosius laidus ir USB kabelį, kai rinkinyje jų nėra.",

  evaluate(kit: KitSnapshot): RuleResult[] {
    const mcuItem = kit.items.find((item) => item.spec.category === "mcu_board")
    if (!mcuItem) {
      return []
    }
    const peripherals = kit.items.filter((item) =>
      ["sensor", "display", "actuator", "communication"].includes(item.spec.category)
    )
    const handles = new Set(kit.items.map((item) => item.spec.productHandle))
    const results: RuleResult[] = []

    const info = (message: string, explanation: string, handle: string, text: string) =>
      results.push({
        ruleId: this.id,
        severity: "info",
        message,
        explanation,
        involvedItemIds: [mcuItem.itemId],
        suggestion: { text, productHandle: handle },
      })

    if (peripherals.length && !handles.has(BREADBOARD_HANDLE)) {
      info(
        "Rinkinyje nėra maketavimo plokštės.",
        "Be maketavimo plokštės modulius teks lituoti arba jungti tiesiai, o tai pradedantiesiems nepatogu ir klaidinga.",
        BREADBOARD_HANDLE,
        "Pridėkite 830 taškų maketavimo plokštę."
      )
    }
    if (peripherals.length && !handles.has(JUMPER_WIRES_HANDLE)) {
      info(
        "Rinkinyje nėra jungiamųjų laidų.",
        "Jutikliams ir moduliams prijungti prie plokštės reikia Dupont laidų (M-M, M-F).",
        JUMPER_WIRES_HANDLE,
        "Pridėkite jungiamųjų laidų rinkinį."
      )
    }
    if (MICRO_USB_BOARD_HANDLES.includes(mcuItem.spec.productHandle) && !handles.has(USB_CABLE_HANDLE)) {
      info(
        `„${mcuItem.spec.title}“ programuojama per Micro-USB, o kabelio rinkinyje nėra.`,
        "Reikalingas kabelis su duomenų linijomis (ne tik įkrovimo), kitaip plokštės nepavyks užprogramuoti.",
        USB_CABLE_HANDLE,
        "Pridėkite Micro-USB duomenų kabelį."
      )
    }

    return results
  },
}
