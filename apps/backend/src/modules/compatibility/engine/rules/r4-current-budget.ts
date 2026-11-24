import { EXTERNAL_POWER_HANDLE } from "../catalog-handles"
import {
  collectRails,
  formatMilliamps,
  formatVolts,
  needsPowerRail,
  pickRailForItem,
  type KitRail,
} from "../rails"
import type {
  CompatibilityRule,
  KitItemSnapshot,
  KitSnapshot,
  RuleResult,
  VariantAlternative,
} from "../types"

/**
 * R4. Srovės biudžetas.
 * Kiekvienam bėgeliui: Σ currentMaxMa × quantity ≤ maxCurrentMa.
 * Viršijus 80 % – įspėjimas (nelieka rezervo pikams), viršijus 100 % – klaida.
 * Bėgeliai su nežinoma riba (null) ir komponentai su nežinoma srove praleidžiami,
 * bet apie praleistus komponentus pranešama `info`, kad rezultatas nebūtų
 * klaidingai raminantis.
 */
export const CURRENT_WARNING_RATIO = 0.8

interface RailLoad {
  rail: KitRail
  totalMa: number
  items: KitItemSnapshot[]
}

export { EXTERNAL_POWER_HANDLE }

/**
 * Iš to paties maitinimo šaltinio variantų parenka mažiausią, kuriam apkrova
 * neviršytų 80 % ribos (tada nebelieka ir įspėjimo). Jei tokio nėra – mažiausią,
 * kuris bent pašalina perkrovą. Grąžina null, jei galingesnio varianto nėra.
 */
export function pickUpgrade(
  provider: KitItemSnapshot,
  currentLimitMa: number,
  loadMa: number
): VariantAlternative | null {
  const larger = (provider.variantAlternatives ?? []).filter(
    (alternative) => alternative.railMaxCurrentMa > currentLimitMa
  )
  return (
    larger.find((alternative) => loadMa <= alternative.railMaxCurrentMa * CURRENT_WARNING_RATIO) ??
    larger.find((alternative) => loadMa <= alternative.railMaxCurrentMa) ??
    null
  )
}

export const r4CurrentBudget: CompatibilityRule = {
  id: "R4",
  name: "Srovės biudžetas",
  description:
    "Komponentų maksimalių srovių suma kiekviename maitinimo bėgelyje neturi viršyti bėgelio ribos.",

  evaluate(kit: KitSnapshot): RuleResult[] {
    const rails = collectRails(kit)
    if (!rails.length) {
      return []
    }

    const loads = new Map<KitRail, RailLoad>()
    const unknownCurrentItems: KitItemSnapshot[] = []

    for (const item of kit.items.filter(needsPowerRail)) {
      const rail = pickRailForItem(item, rails)
      if (!rail) {
        continue // R2 jau pranešė, kad bėgelio nėra
      }
      if (item.spec.currentMaxMa === null) {
        unknownCurrentItems.push(item)
        continue
      }

      const load = loads.get(rail) ?? { rail, totalMa: 0, items: [] }
      load.totalMa += item.spec.currentMaxMa * item.quantity
      load.items.push(item)
      loads.set(rail, load)
    }

    const results: RuleResult[] = []

    for (const { rail, totalMa, items } of loads.values()) {
      if (rail.maxCurrentMa === null) {
        continue
      }

      const ratio = totalMa / rail.maxCurrentMa
      if (ratio <= CURRENT_WARNING_RATIO) {
        continue
      }

      const railName = `${rail.label} (${rail.providerTitle})`
      const involvedItemIds = [...items.map((item) => item.itemId), rail.providerItemId]
      const provider = kit.items.find((item) => item.itemId === rail.providerItemId)
      const isSupply = provider?.spec.category === "power"
      const upgrade = provider ? pickUpgrade(provider, rail.maxCurrentMa, totalMa) : null
      const upgradeSuggestion = upgrade
        ? {
            text: `Pakeiskite į ${upgrade.title} variantą (iki ${formatMilliamps(upgrade.railMaxCurrentMa)}).`,
            replaceItemId: rail.providerItemId,
            replaceWithVariantId: upgrade.variantId,
          }
        : undefined

      if (ratio > 1) {
        results.push({
          ruleId: this.id,
          severity: "error",
          message: isSupply
            ? `Maitinimo šaltinis „${rail.providerTitle}“ persilpnas: reikia ${formatMilliamps(totalMa)}, o jis duoda ${formatMilliamps(rail.maxCurrentMa)}.`
            : `Bėgelis ${railName} perkrautas: ${formatMilliamps(totalMa)} iš leidžiamų ${formatMilliamps(rail.maxCurrentMa)}.`,
          explanation:
            "Viršijus bėgelio ribą įtampa krinta, mikrovaldiklis persikrauna arba suveikia apsaugos saugiklis; ilgainiui gali perkaisti reguliatorius. Galingus vartotojus (servo, LED juostas) maitinkite iš atskiro pakankamos galios šaltinio, bendrinant tik GND.",
          involvedItemIds,
          suggestion:
            upgradeSuggestion ??
            (isSupply
              ? {
                  // Jau atskiras šaltinis ir galingesnio varianto nėra
                  text: "Galingesnio šio šaltinio varianto nėra: padalinkite apkrovą tarp kelių šaltinių arba rinkitės aukštesnės įtampos (12 V / 24 V) juostą – jai reikia mažesnės srovės.",
                }
              : {
                  text: `Pridėkite išorinį ${formatVolts(rail.voltageV)} maitinimo šaltinį galingiems komponentams.`,
                  productHandle: EXTERNAL_POWER_HANDLE,
                }),
        })
      } else {
        results.push({
          ruleId: this.id,
          severity: "warning",
          message: `Bėgelis ${railName} apkrautas ${Math.round(ratio * 100)} %: ${formatMilliamps(totalMa)} iš ${formatMilliamps(rail.maxCurrentMa)}.`,
          explanation:
            "Lieka mažas rezervas srovės pikams (variklio startas, Wi-Fi siuntimas, LED juostos baltos šviesos režimas). Veiks, bet ribose; patikimumui rinkitės bent 20 % galingesnį šaltinį.",
          involvedItemIds,
          suggestion: upgradeSuggestion,
        })
      }
    }

    if (unknownCurrentItems.length) {
      results.push({
        ruleId: this.id,
        severity: "info",
        message: `Srovės biudžete neįvertinti: ${unknownCurrentItems.map((item) => item.spec.title).join(", ")}.`,
        explanation:
          "Šių komponentų maksimali srovė specifikacijoje nenurodyta, todėl bėgelių apkrova gali būti didesnė nei suskaičiuota.",
        involvedItemIds: unknownCurrentItems.map((item) => item.itemId),
      })
    }

    return results
  },
}
