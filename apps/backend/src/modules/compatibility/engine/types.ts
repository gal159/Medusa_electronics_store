/**
 * Suderinamumo variklio tipai. Šis katalogas yra grynas TypeScript be Medusa
 * importų: variklis gauna normalizuotą rinkinio vaizdą (KitSnapshot) ir
 * grąžina rezultatų sąrašą. Snapshot'ą iš DB sudaro Medusa servisas.
 */

export type Severity = "error" | "warning" | "info"

/** Atitinka ComponentSpec.category. */
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

/** Sąsaja, kurios komponentas reikalauja iš mikrovaldiklio. */
export type InterfaceType =
  | "i2c"
  | "spi"
  | "uart"
  | "analog_in"
  | "digital_io"
  | "pwm"
  | "onewire"

export interface InterfaceRequirement {
  type: InterfaceType
  /** Kiek MCU kontaktų užima (I2C ir SPI magistralė gali būti dalijama). */
  pinCount: number
  /** Galimi I2C adresai, pvz. [0x76, 0x77]. Tik `i2c` tipui. */
  i2cAddresses?: number[]
  /** Ar adresą galima pakeisti (jumper'iu, kontaktu ar lydmetalio tilteliu). */
  i2cAddressSelectable?: boolean
}

/** Maitinimo bėgelis, kurį suteikia MCU plokštė arba maitinimo modulis. */
export interface PowerRail {
  /** Pvz. „5V (USB)“, „3V3“. Unikalus komponento ribose. */
  label: string
  voltageV: number
  /** null, kai riba nežinoma; tada srovės biudžetas tam bėgeliui netikrinamas. */
  maxCurrentMa: number | null
}

/** Ką MCU plokštė suteikia. Tik `mcu_board` kategorijai. */
export interface McuCapabilities {
  digitalPins: number
  analogInputs: number
  /** Kiek ADC įėjimų lieka naudotinų veikiant Wi-Fi (ESP32 ADC2 apribojimas). null = nėra apribojimo. */
  analogInputsUsableWithWifi: number | null
  pwmPins: number
  i2cBuses: number
  spiBuses: number
  uarts: number
  hasWifi: boolean
  /** GPIO loginis lygis voltais (3.3 arba 5). */
  ioVoltageV: number
  /** Ar GPIO įėjimai toleruoja 5 V signalą. */
  isFiveVoltTolerant: boolean
}

/** LED juostos valdymo protokolas: adresuojamos juostos arba vienos spalvos (PWM). */
export type LedProtocol = "ws2812b" | "ws2811" | "single_color"

/**
 * Sričiai specifiniai duomenys. LED juostai – protokolas ir tai, kad
 * specifikacija (srovė) yra vienam metrui (kiekis = metrai). LED valdikliui –
 * palaikomi protokolai ir maks. išėjimo srovė (null = valdiklis tik siunčia
 * duomenis, o juostos maitinimas jungiamas tiesiai iš maitinimo šaltinio).
 */
export interface ComponentAttributes {
  ledProtocol?: LedProtocol
  perMeter?: boolean
  supportedProtocols?: LedProtocol[]
  outputCurrentMaxMa?: number | null
}

/** Vieno parduodamo modulio techninė specifikacija (normalizuota). */
export interface ComponentSpecSnapshot {
  specId: string
  productId: string
  /** Produkto pavadinimas pranešimams. */
  title: string
  /** Produkto handle pasiūlymų nuorodoms. */
  productHandle: string
  category: SpecCategory
  /** Modulio VCC intervalas. null priedams ir pasyviems komponentams, kuriems maitinimas nereikalingas. */
  supplyVoltageMinV: number | null
  supplyVoltageMaxV: number | null
  /** Kokiu lygiu modulis išveda signalus. null = neišveda arba nežinoma. */
  logicVoltageV: number | null
  /** Minimalus VIH, kurį modulis turi gauti, kad atpažintų „1“. */
  inputHighMinV: number | null
  /** Ar modulio įėjimai toleruoja 5 V. */
  isFiveVoltTolerant: boolean
  currentTypMa: number | null
  /** Maksimali srovė biudžetui (servo stall, Wi-Fi TX pikas). */
  currentMaxMa: number | null
  datasheetUrl: string
  interfaces: InterfaceRequirement[]
  powerRails: PowerRail[]
  mcu: McuCapabilities | null
  attributes?: ComponentAttributes | null
}

/** Kito tos pačios prekės varianto duomenys (pvz., galingesnis maitinimo šaltinis). */
export interface VariantAlternative {
  variantId: string
  title: string
  railMaxCurrentMa: number
}

export interface KitItemSnapshot {
  /** Eilutės identifikatorius (variant id arba krepšelio eilutės id). */
  itemId: string
  quantity: number
  spec: ComponentSpecSnapshot
  /** Naudotojo priskirtas bėgelis (PowerRail.label); jei nėra, parenkamas automatiškai. */
  assignedRailLabel?: string
  /**
   * Kiti tos pačios prekės variantai su kita bėgelio srovės riba, surikiuoti
   * didėjančiai. Juos paduoda snapshot.ts, kad R4 galėtų pasiūlyti galingesnį
   * maitinimo šaltinį neišeidamas iš grynos funkcijos ribų.
   */
  variantAlternatives?: VariantAlternative[]
}

export interface KitSnapshot {
  items: KitItemSnapshot[]
}

export interface RuleSuggestion {
  text: string
  /** Katalogo produkto handle, kurį siūloma pridėti. */
  productHandle?: string
  /**
   * Rinkinio eilutė (itemId), kurią siūloma pakeisti: kitu tos pačios prekės
   * variantu (`replaceWithVariantId`) arba kita preke (`productHandle`).
   */
  replaceItemId?: string
  /** Variantas, kuriuo siūloma pakeisti `replaceItemId`. */
  replaceWithVariantId?: string
}

export interface RuleResult {
  ruleId: string
  severity: Severity
  /** Trumpas pranešimas naudotojui, LT. */
  message: string
  /** Kodėl tai problema, LT. */
  explanation: string
  involvedItemIds: string[]
  suggestion?: RuleSuggestion
  /** Datasheet ar dokumentacijos nuoroda. */
  source?: string
}

export interface CompatibilityRule {
  /** Pvz. "R3". */
  id: string
  name: string
  description: string
  evaluate(kit: KitSnapshot): RuleResult[]
}

export interface ValidationSummary {
  errors: number
  warnings: number
  infos: number
}

export interface ValidationReport {
  results: RuleResult[]
  summary: ValidationSummary
  /** false, kai yra bent vienas `error`: tokio rinkinio užsakyti negalima. */
  isOrderable: boolean
  /** Kurios taisyklės buvo vykdomos. */
  evaluatedRuleIds: string[]
}
