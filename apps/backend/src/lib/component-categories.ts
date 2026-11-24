/**
 * Komponentų kategorijos. `specCategory` atitinka `ComponentSpec.category`
 * enum ir naudojamas
 * suderinamumo variklyje (pvz., R1 ieško `mcu_board`). Kategorijos handle
 * yra stabilus raktas, pagal kurį seed skriptai ir storefront randa kategoriją.
 */
export type SpecCategory =
  | "mcu_board"
  | "sensor"
  | "display"
  | "actuator"
  | "power"
  | "communication"
  | "passive"
  | "accessory"
  | "led_controller"

export type ComponentCategory = {
  handle: string
  name: string
  description: string
  specCategory: SpecCategory
}

export const COMPONENT_CATEGORIES: ComponentCategory[] = [
  {
    handle: "mikrovaldikliai",
    name: "Mikrovaldikliai",
    description: "Mikrovaldiklių plokštės: rinkinio pagrindas.",
    specCategory: "mcu_board",
  },
  {
    handle: "jutikliai",
    name: "Jutikliai",
    description: "Temperatūros, slėgio, atstumo, judesio ir kiti jutikliai.",
    specCategory: "sensor",
  },
  {
    handle: "ekranai",
    name: "Ekranai",
    description: "OLED ir LCD ekranų moduliai.",
    specCategory: "display",
  },
  {
    handle: "pavaros",
    name: "Pavaros ir vykdikliai",
    description: "Servo varikliai, žingsniniai varikliai, relės, LED juostos.",
    specCategory: "actuator",
  },
  {
    handle: "led-apsvietimas",
    name: "LED apšvietimas",
    description: "LED juostos (parduodamos metrais) ir LED valdikliai.",
    specCategory: "actuator",
  },
  {
    handle: "maitinimas",
    name: "Maitinimas",
    description: "Maitinimo moduliai, adapteriai, baterijų laikikliai.",
    specCategory: "power",
  },
  {
    handle: "rysio-moduliai",
    name: "Ryšio moduliai",
    description: "Bluetooth, radijo ir kiti ryšio moduliai.",
    specCategory: "communication",
  },
  {
    handle: "pasyvus-komponentai",
    name: "Pasyvūs komponentai",
    description: "Rezistoriai, kondensatoriai ir jų rinkiniai.",
    specCategory: "passive",
  },
  {
    handle: "priedai",
    name: "Priedai",
    description: "Maketavimo plokštės, laidai, kabeliai, lygių keitikliai.",
    specCategory: "accessory",
  },
]
