import { LED_DIMMER_HANDLE, LED_PIXEL_CONTROLLER_HANDLE } from "../catalog-handles"
import { formatMilliamps } from "../rails"
import type {
  CompatibilityRule,
  KitItemSnapshot,
  KitSnapshot,
  LedProtocol,
  RuleResult,
  RuleSuggestion,
} from "../types"
import { needsMcu } from "./r1-mcu-presence"

/**
 * R9. LED juostos valdymas.
 *
 *  - Adresuojamą juostą (WS2812B, WS2811) valdo mikrovaldiklis arba LED
 *    valdiklis, palaikantis jos protokolą.
 *  - Vienos spalvos (COB) juosta reikalauja PWM dimerio: MCU kontaktas jos
 *    srovės tiesiogiai nepakelia (reikėtų MOSFET grandinės). Jei
 *    mikrovaldiklio rinkinyje niekam kitam nereikia, siūloma jį pakeisti
 *    dimeriu, o ne pridėti dimerį šalia.
 *  - Jei juostos srovė teka per valdiklį (`outputCurrentMaxMa`), juostų
 *    suminė srovė neturi viršyti jo ribos.
 * Jei rinkinyje nėra nei MCU, nei LED valdiklio, taisyklė tyli – tai R1 klaida.
 */
const PROTOCOL_NAMES: Record<LedProtocol, string> = {
  ws2812b: "WS2812B",
  ws2811: "WS2811",
  single_color: "vienos spalvos (PWM)",
}

function stripCurrentMa(item: KitItemSnapshot): number {
  return (item.spec.currentMaxMa ?? 0) * item.quantity
}

function supports(controller: KitItemSnapshot, strip: KitItemSnapshot): boolean {
  return Boolean(controller.spec.attributes?.supportedProtocols?.includes(strip.spec.attributes!.ledProtocol!))
}

export const r9LedControl: CompatibilityRule = {
  id: "R9",
  name: "LED juostos valdymas",
  description:
    "LED juostą turi valdyti jos protokolą palaikantis valdiklis arba mikrovaldiklis; per valdiklį tekanti srovė neturi viršyti jo ribos.",

  evaluate(kit: KitSnapshot): RuleResult[] {
    const strips = kit.items.filter((item) => item.spec.attributes?.ledProtocol)
    const mcus = kit.items.filter((item) => item.spec.category === "mcu_board")
    const hasMcu = mcus.length > 0
    const controllers = kit.items.filter((item) => item.spec.category === "led_controller")
    // MCU reikalingas, jei jo reikia kitiems komponentams arba adresuojamai juostai be tinkamo valdiklio
    const mcuNeeded =
      kit.items.some(needsMcu) ||
      strips.some(
        (strip) =>
          strip.spec.attributes!.ledProtocol !== "single_color" &&
          !controllers.some((controller) => supports(controller, strip))
      )

    if (!strips.length || (!hasMcu && !controllers.length)) {
      return []
    }

    const results: RuleResult[] = []

    for (const strip of strips) {
      const protocol = strip.spec.attributes!.ledProtocol!
      const matching = controllers.filter((controller) => supports(controller, strip))
      const addressable = protocol !== "single_color"

      if (matching.length || (addressable && hasMcu)) {
        continue
      }

      // Vienos spalvos juostai užtenka dimerio: jei MCU niekam kitam nereikalingas, siūloma jį pakeisti
      const replaceableMcu = !addressable && hasMcu && !mcuNeeded ? mcus[0] : null
      const suggestion: RuleSuggestion = addressable
        ? { text: "Pridėkite adresuojamų juostų valdiklį SP110E.", productHandle: LED_PIXEL_CONTROLLER_HANDLE }
        : replaceableMcu
          ? {
              text: `Vienos spalvos juostai užtenka dimerio: pakeiskite „${replaceableMcu.spec.title}“ dimeriu.`,
              productHandle: LED_DIMMER_HANDLE,
              replaceItemId: replaceableMcu.itemId,
            }
          : { text: "Pridėkite vienos spalvos LED dimerį: per jį tekės juostos srovė.", productHandle: LED_DIMMER_HANDLE }

      results.push({
        ruleId: this.id,
        severity: "error",
        message: addressable
          ? `„${strip.spec.title}“ (${PROTOCOL_NAMES[protocol]}) neturi tinkamo valdiklio.`
          : `„${strip.spec.title}“ reikia PWM dimerio: mikrovaldiklio kontaktas vienos spalvos juostos tiesiogiai nevaldo.`,
        explanation: addressable
          ? "Rinkinio LED valdiklis šio protokolo nepalaiko. Reikia valdiklio, palaikančio juostos protokolą, arba mikrovaldiklio."
          : "Vienos spalvos juosta naudoja šimtus miliamperų ar amperus, o mikrovaldiklio kontaktas – kelias dešimtis miliamperų. Ryškumą reguliuoja dimeris (PWM su galios tranzistoriumi), per kurį teka juostos srovė." +
            (replaceableMcu ? " Kitiems rinkinio komponentams mikrovaldiklio nereikia, todėl dimeris jį pakeičia." : ""),
        involvedItemIds: [
          strip.itemId,
          ...(addressable ? [] : mcus.map((mcu) => mcu.itemId)),
          ...controllers.map((controller) => controller.itemId),
        ],
        suggestion,
        source: strip.spec.datasheetUrl || undefined,
      })
    }

    // Per valdiklį tekanti srovė: priskiriama pirmam tinkamam valdikliui
    for (const controller of controllers) {
      const limitMa = controller.spec.attributes?.outputCurrentMaxMa
      if (!limitMa) {
        continue
      }
      const driven = strips.filter((strip) => supports(controller, strip))
      const loadMa = driven.reduce((sum, strip) => sum + stripCurrentMa(strip), 0)
      if (loadMa <= limitMa * controller.quantity) {
        continue
      }
      results.push({
        ruleId: this.id,
        severity: "error",
        message: `„${controller.spec.title}“ perkrautas: juostos ima ${formatMilliamps(loadMa)}, o valdiklio riba ${formatMilliamps(limitMa * controller.quantity)}.`,
        explanation:
          "Juostos srovė teka per valdiklio galios tranzistorių; viršijus ribą jis kaista ir gali sugesti. Sutrumpinkite juostą arba padalinkite ją į kelias dalis su atskirais valdikliais.",
        involvedItemIds: [controller.itemId, ...driven.map((strip) => strip.itemId)],
        suggestion: {
          text: `Reikia ${Math.ceil(loadMa / limitMa)} valdiklių arba trumpesnės juostos.`,
        },
        source: controller.spec.datasheetUrl || undefined,
      })
    }

    return results
  },
}
