import { EXTERNAL_POWER_HANDLE, EXTERNAL_POWER_VOLTAGES_V, LED_PSU_BY_VOLTAGE } from "../catalog-handles"
import {
  collectRails,
  formatVolts,
  needsPowerRail,
  pickRailForItem,
  railFitsItem,
  type KitRail,
} from "../rails"
import type { CompatibilityRule, KitItemSnapshot, KitSnapshot, RuleResult, RuleSuggestion } from "../types"

/**
 * R2. Maitinimo įtampa.
 * Kiekvienam maitinamam komponentui turi egzistuoti bėgelis, kurio įtampa
 * patenka į [supplyVoltageMinV, supplyVoltageMaxV]. Jei rinkinyje visai nėra
 * bėgelių (nėra MCU ir maitinimo modulio), taisyklė tyli: tą jau praneša R1.
 *
 * Pasiūlymas priklauso nuo reikiamos įtampos:
 *  - 3,3 V arba 5 V → MB102 maketavimo plokštės maitinimo modulis;
 *  - kita (pvz., 12 V ar 24 V LED juostai) → tos įtampos LED maitinimo
 *    šaltinis. Jei rinkinyje jau yra LED šaltinis, kurio pakeitimas
 *    nepakenktų kitiems ant jo esantiems komponentams, siūloma jį pakeisti.
 */
export const r2SupplyVoltage: CompatibilityRule = {
  id: "R2",
  name: "Maitinimo įtampa",
  description:
    "Kiekvienam komponentui turi būti maitinimo bėgelis, kurio įtampa atitinka komponento VCC intervalą.",

  evaluate(kit: KitSnapshot): RuleResult[] {
    const rails = collectRails(kit)
    if (!rails.length) {
      return []
    }

    const availableVoltages = [...new Set(rails.map((rail) => rail.voltageV))]
      .sort((a, b) => a - b)
      .map(formatVolts)
      .join(", ")

    return kit.items.filter(needsPowerRail).flatMap((item): RuleResult[] => {
      const rail = pickRailForItem(item, rails)
      if (rail) {
        return []
      }

      const { title, datasheetUrl } = item.spec
      // needsPowerRail garantuoja, kad intervalas žinomas
      const minV = item.spec.supplyVoltageMinV!
      const maxV = item.spec.supplyVoltageMaxV!
      const range =
        minV === maxV ? formatVolts(minV) : `${formatVolts(minV)} – ${formatVolts(maxV)}`
      const suggestion = suggestSupply(item, kit, rails, range)

      return [
        {
          ruleId: this.id,
          severity: "error",
          message: `„${title}“ reikia ${range} maitinimo, o rinkinys suteikia tik ${availableVoltages}.`,
          explanation:
            "Per maža įtampa: modulis neįsijungs arba veiks nestabiliai. Per didelė įtampa: modulis gali sugesti. Pridėkite maitinimo šaltinį su tinkamu bėgeliu arba rinkitės kitos įtampos versiją.",
          involvedItemIds: suggestion.replaceItemId ? [item.itemId, suggestion.replaceItemId] : [item.itemId],
          suggestion,
          source: datasheetUrl,
        },
      ]
    })
  },
}

function suggestSupply(item: KitItemSnapshot, kit: KitSnapshot, rails: KitRail[], range: string): RuleSuggestion {
  const fitsItem = (voltageV: number) => railFitsItem({ label: "", voltageV, maxCurrentMa: null }, item)

  if (EXTERNAL_POWER_VOLTAGES_V.some(fitsItem)) {
    return {
      text: "Maketavimo plokštės maitinimo modulis MB102 suteikia ir 3,3 V, ir 5 V bėgelius.",
      productHandle: EXTERNAL_POWER_HANDLE,
    }
  }

  const psu = LED_PSU_BY_VOLTAGE.find((candidate) => fitsItem(candidate.voltageV))
  if (!psu) {
    return { text: `Reikia ${range} maitinimo šaltinio.` }
  }

  // Esamą LED šaltinį galima pakeisti, jei visi kiti ant jo esantys komponentai tiks ir naujai įtampai
  const ledPsuHandles = LED_PSU_BY_VOLTAGE.map((candidate) => candidate.handle)
  const newRail = { label: "", voltageV: psu.voltageV, maxCurrentMa: null }
  const replaceable = kit.items.find(
    (supply) =>
      ledPsuHandles.includes(supply.spec.productHandle) &&
      kit.items.every(
        (consumer) =>
          consumer === item ||
          !needsPowerRail(consumer) ||
          pickRailForItem(consumer, rails)?.providerItemId !== supply.itemId ||
          railFitsItem(newRail, consumer)
      )
  )

  return replaceable
    ? {
        text: `Pakeiskite „${replaceable.spec.title}“ ${formatVolts(psu.voltageV)} LED maitinimo šaltiniu.`,
        productHandle: psu.handle,
        replaceItemId: replaceable.itemId,
      }
    : { text: `Pridėkite ${formatVolts(psu.voltageV)} LED maitinimo šaltinį.`, productHandle: psu.handle }
}
