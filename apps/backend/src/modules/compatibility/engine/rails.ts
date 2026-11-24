/**
 * Bendri pagalbininkai maitinimo bėgeliams (R2 ir R4).
 *
 * Bėgelius rinkiniui suteikia `mcu_board` ir `power` kategorijų komponentai.
 * Komponentui bėgelis parenkamas taip: jei naudotojas priskyrė `assignedRailLabel`,
 * imamas jis; kitu atveju iš bėgelių, kurių įtampa patenka į komponento
 * maitinimo intervalą, renkamasi pagal:
 *  1. žemiausią įtampą (mažesnis šilumos išsiskyrimas, saugesnis loginis lygis);
 *  2. esant vienodai įtampai – atskirą maitinimo šaltinį (`power`), o ne MCU
 *     plokštę: būtent tam jis į rinkinį ir dedamas (pvz., varikliams);
 *  3. didesnę srovės ribą (nežinoma riba laikoma mažiausia).
 */
import type { KitItemSnapshot, KitSnapshot, PowerRail, SpecCategory } from "./types"

export interface KitRail extends PowerRail {
  /** Komponentas, kuris suteikia bėgelį. */
  providerItemId: string
  providerTitle: string
  providerCategory: SpecCategory
}

const RAIL_PROVIDER_CATEGORIES: SpecCategory[] = ["mcu_board", "power"]

/** Kategorijos, kurioms maitinimo bėgelis nereikalingas. */
const SELF_SUFFICIENT_CATEGORIES: SpecCategory[] = ["mcu_board", "power", "passive", "accessory"]

export function collectRails(kit: KitSnapshot): KitRail[] {
  return kit.items
    .filter((item) => RAIL_PROVIDER_CATEGORIES.includes(item.spec.category))
    .flatMap((item) =>
      item.spec.powerRails.map((rail) => ({
        ...rail,
        providerItemId: item.itemId,
        providerTitle: item.spec.title,
        providerCategory: item.spec.category,
      }))
    )
}

export function needsPowerRail(item: KitItemSnapshot): boolean {
  const { category, supplyVoltageMinV, supplyVoltageMaxV } = item.spec
  return (
    !SELF_SUFFICIENT_CATEGORIES.includes(category) &&
    supplyVoltageMinV !== null &&
    supplyVoltageMaxV !== null
  )
}

export function railFitsItem(rail: PowerRail, item: KitItemSnapshot): boolean {
  const { supplyVoltageMinV, supplyVoltageMaxV } = item.spec
  if (supplyVoltageMinV === null || supplyVoltageMaxV === null) {
    return false
  }
  return rail.voltageV >= supplyVoltageMinV && rail.voltageV <= supplyVoltageMaxV
}

export function pickRailForItem(item: KitItemSnapshot, rails: KitRail[]): KitRail | null {
  if (item.assignedRailLabel) {
    return rails.find((rail) => rail.label === item.assignedRailLabel) ?? null
  }

  const fitting = rails.filter((rail) => railFitsItem(rail, item))
  if (!fitting.length) {
    return null
  }

  return [...fitting].sort(compareRailPreference)[0]
}

/** Neigiamas rezultatas = `a` tinkamesnis. Žr. kriterijus failo pradžioje. */
function compareRailPreference(a: KitRail, b: KitRail): number {
  if (a.voltageV !== b.voltageV) {
    return a.voltageV - b.voltageV
  }
  const aIsSupply = a.providerCategory === "power" ? 0 : 1
  const bIsSupply = b.providerCategory === "power" ? 0 : 1
  if (aIsSupply !== bIsSupply) {
    return aIsSupply - bIsSupply
  }
  return (b.maxCurrentMa ?? -1) - (a.maxCurrentMa ?? -1)
}

export function formatVolts(value: number): string {
  return `${value.toLocaleString("lt-LT", { maximumFractionDigits: 2 })} V`
}

export function formatMilliamps(value: number): string {
  return `${Math.round(value).toLocaleString("lt-LT")} mA`
}
