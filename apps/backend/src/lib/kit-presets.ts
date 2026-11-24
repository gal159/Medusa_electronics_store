/**
 * Rinkinių šablonai (presets). Šablonas – tai pozicijos (maitinimo šaltinis,
 * valdiklis, juosta, jutikliai), kurių kiekvienoje leidžiamos tam tikros
 * prekės ir nurodytas numatytasis pasirinkimas. Konfigūratorius iš šablono
 * užpildo rinkinį, o naudotojas pozicijas keičia; suderinamumą tikrina tas
 * pats variklis, todėl šablonui atskirų taisyklių nereikia.
 *
 * Šablonai aprašyti kode (ne DB): jų nedaug, jie keičiasi kartu su katalogu,
 * o studentas juos versijuoja Git'e. Numatytasis kiekvieno šablono rinkinys
 * turi būti be klaidų (tikrina kit-presets.unit.spec.ts).
 */

export interface KitPresetSlot {
  key: string
  label: string
  /** Leidžiamos prekės (handle), rodomos pasirinkimo sąraše šia tvarka. */
  allowedHandles: string[]
  /** Numatytasis pasirinkimas; nėra – pozicija pradžioje tuščia. */
  default?: {
    handle: string
    /** Kelių variantų prekei (pvz., „6 A“); nenurodyta – pirmas variantas. */
    variantTitle?: string
    quantity?: number
  }
  /** Galima palikti tuščią. */
  optional?: boolean
  /** Galima pasirinkti kelias prekes (pvz., keli jutikliai). */
  multiple?: boolean
  /** Kiekis keičiamas (pvz., juostos metrai). */
  quantity?: { label: string; min: number; max: number }
  hint?: string
}

export interface KitPreset {
  id: string
  name: string
  description: string
  slots: KitPresetSlot[]
}

export const KIT_PRESETS: KitPreset[] = [
  {
    id: "led-rinkinys",
    name: "LED rinkinys",
    description:
      "LED juosta su maitinimo šaltiniu ir valdikliu. Didinant juostos ilgį patikra parodys, kada maitinimo šaltinis tampa per silpnas, ir pasiūlys galingesnį.",
    slots: [
      {
        key: "psu",
        label: "Maitinimo šaltinis",
        allowedHandles: [
          "led-maitinimo-saltinis-5v",
          "led-maitinimo-saltinis-12v",
          "led-maitinimo-saltinis-24v",
        ],
        default: { handle: "led-maitinimo-saltinis-5v", variantTitle: "6 A" },
        hint: "Įtampa turi sutapti su juostos įtampa, srovė – bent 20 % didesnė už juostos.",
      },
      {
        key: "controller",
        label: "Valdiklis",
        allowedHandles: [
          "arduino-uno-r3",
          "esp32-devkit-v1",
          "raspberry-pi-pico",
          "sp110e-led-valdiklis",
          "led-dimeris-vienos-spalvos",
        ],
        default: { handle: "arduino-uno-r3" },
        hint: "Mikrovaldiklis – jei norite programuoti efektus ar naudoti jutiklius; LED valdiklis – be programavimo.",
      },
      {
        key: "strip",
        label: "LED juosta",
        allowedHandles: ["ws2812b-juosta-1m", "ws2811-juosta-12v", "cob-juosta-12v", "cob-juosta-24v"],
        default: { handle: "ws2812b-juosta-1m", quantity: 2 },
        quantity: { label: "Metrai", min: 1, max: 20 },
      },
      {
        key: "sensors",
        label: "Papildomi jutikliai",
        allowedHandles: ["pir-hc-sr501", "bh1750"],
        optional: true,
        multiple: true,
        hint: "Judesio ar šviesos jutikliui reikia mikrovaldiklio.",
      },
    ],
  },
]
