import type { CompatibilityRule, KitItemSnapshot, KitSnapshot, RuleResult } from "../types"

/**
 * R5. I2C adresų konfliktai.
 *
 * Visi I2C įrenginiai laikomi prijungtais prie vienos magistralės (dauguma
 * pradedančiųjų projektų), todėl kiekvienam įrenginio vienetui reikia unikalaus
 * 7 bitų adreso. Algoritmas:
 *  1. Kiekvienas vienetas (item × quantity) turi galimų adresų sąrašą: jei
 *     adresas keičiamas – visi datasheet adresai, kitaip – tik numatytasis.
 *  2. Fiksuoti vienetai užima savo adresą; du fiksuoti tame pačiame adrese → klaida.
 *  3. Keičiami vienetai godžiai gauna pirmą laisvą adresą; jei teko nukrypti
 *     nuo numatytojo → įspėjimas su instrukcija; jei laisvų nebeliko → klaida.
 */
interface I2cUnit {
  item: KitItemSnapshot
  options: number[]
  selectable: boolean
}

export function formatI2cAddress(address: number): string {
  return `0x${address.toString(16).toUpperCase().padStart(2, "0")}`
}

function collectI2cUnits(kit: KitSnapshot): I2cUnit[] {
  const units: I2cUnit[] = []
  for (const item of kit.items) {
    for (const iface of item.spec.interfaces) {
      if (iface.type !== "i2c" || !iface.i2cAddresses?.length) {
        continue
      }
      const selectable = Boolean(iface.i2cAddressSelectable) && iface.i2cAddresses.length > 1
      const options = selectable ? iface.i2cAddresses : [iface.i2cAddresses[0]]
      for (let unit = 0; unit < item.quantity; unit++) {
        units.push({ item, options, selectable })
      }
    }
  }
  return units
}

export const r5I2cAddresses: CompatibilityRule = {
  id: "R5",
  name: "I2C adresų konfliktai",
  description:
    "Vienoje I2C magistralėje kiekvienas įrenginys turi turėti unikalų adresą; keičiamas adresas duoda įspėjimą, nekeičiamas – klaidą.",

  evaluate(kit: KitSnapshot): RuleResult[] {
    const units = collectI2cUnits(kit)
    if (units.length < 2) {
      return []
    }

    const results: RuleResult[] = []
    const taken = new Map<number, KitItemSnapshot>()

    // 2. Fiksuoti adresai
    for (const unit of units.filter((unit) => !unit.selectable)) {
      const address = unit.options[0]
      const holder = taken.get(address)
      if (!holder) {
        taken.set(address, unit.item)
        continue
      }
      results.push({
        ruleId: this.id,
        severity: "error",
        message: `I2C adreso ${formatI2cAddress(address)} konfliktas: „${holder.spec.title}“ ir „${unit.item.spec.title}“ turi tą patį nekeičiamą adresą.`,
        explanation:
          "Du įrenginiai su vienodu adresu vienoje magistralėje atsakinėja vienu metu ir duomenys sugadinami. Rinkitės modulį su kitu adresu, antrą I2C magistralę (jei MCU turi) arba I2C multiplekserį (TCA9548A).",
        involvedItemIds: unique([holder.itemId, unit.item.itemId]),
        suggestion: {
          text: "Pakeiskite vieną iš įrenginių versija su kitu adresu arba naudokite I2C multiplekserį.",
        },
        source: unit.item.spec.datasheetUrl,
      })
    }

    // 3. Keičiami adresai
    for (const unit of units.filter((unit) => unit.selectable)) {
      const [defaultAddress, ...alternatives] = unit.options
      if (!taken.has(defaultAddress)) {
        taken.set(defaultAddress, unit.item)
        continue
      }

      const free = alternatives.find((address) => !taken.has(address))
      if (free !== undefined) {
        taken.set(free, unit.item)
        results.push({
          ruleId: this.id,
          severity: "warning",
          message: `„${unit.item.spec.title}“ numatytasis I2C adresas ${formatI2cAddress(defaultAddress)} jau užimtas: nustatykite ${formatI2cAddress(free)}.`,
          explanation:
            "Adresas keičiamas kontaktu arba lydmetalio tilteliu (žr. datasheet). Nepakeitus adreso abu įrenginiai atsakinės vienu metu ir rodys neteisingus duomenis.",
          involvedItemIds: unique([unit.item.itemId, taken.get(defaultAddress)!.itemId]),
          suggestion: {
            text: `Prijunkite adreso kontaktą prie kito lygio, kad adresas taptų ${formatI2cAddress(free)}.`,
          },
          source: unit.item.spec.datasheetUrl,
        })
        continue
      }

      results.push({
        ruleId: this.id,
        severity: "error",
        message: `„${unit.item.spec.title}“ nebeturi laisvo I2C adreso: visi galimi (${unit.options.map(formatI2cAddress).join(", ")}) jau užimti.`,
        explanation:
          "Įrenginių su tuo pačiu adresų rinkiniu negali būti daugiau nei adresų. Reikia I2C multiplekserio arba antros magistralės.",
        involvedItemIds: unique([
          unit.item.itemId,
          ...unit.options.map((address) => taken.get(address)!.itemId),
        ]),
        suggestion: {
          text: "Sumažinkite vienodų įrenginių kiekį arba pridėkite I2C multiplekserį (TCA9548A).",
        },
        source: unit.item.spec.datasheetUrl,
      })
    }

    return results
  },
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)]
}
