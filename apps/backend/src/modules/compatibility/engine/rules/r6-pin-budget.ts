import type {
  CompatibilityRule,
  InterfaceType,
  KitItemSnapshot,
  KitSnapshot,
  McuCapabilities,
  RuleResult,
} from "../types"

/**
 * R6. Kontaktų ir sąsajų pakankamumas.
 *
 * Skaičiuojama, kiek MCU resursų reikia visiems komponentams:
 *  - I2C: magistralė dalijama, 2 kontaktai nepriklausomai nuo įrenginių skaičiaus;
 *  - SPI: 3 bendri kontaktai (SCK, MOSI, MISO) + kiekvieno įrenginio nuosavi
 *    (pinCount − 3, pvz. CS arba CS+CE);
 *  - UART, PWM, analog_in, digital_io, onewire: po `pinCount` kiekvienam vienetui.
 * Visi skaitmeniniai poreikiai sumuojami ir lyginami su `digitalPins`; PWM,
 * analoginiai įėjimai ir UART dar lyginami su atitinkamomis MCU ribomis.
 */
export const I2C_BUS_PINS = 2
export const SPI_SHARED_PINS = 3

interface Demand {
  digital: number
  analog: number
  pwm: number
  uarts: number
  usesI2c: boolean
  usesSpi: boolean
  byItem: Map<InterfaceType, KitItemSnapshot[]>
}

export function calculateDemand(items: KitItemSnapshot[]): Demand {
  const demand: Demand = {
    digital: 0,
    analog: 0,
    pwm: 0,
    uarts: 0,
    usesI2c: false,
    usesSpi: false,
    byItem: new Map(),
  }

  for (const item of items) {
    for (const iface of item.spec.interfaces) {
      const pins = iface.pinCount * item.quantity
      const list = demand.byItem.get(iface.type) ?? []
      list.push(item)
      demand.byItem.set(iface.type, list)

      switch (iface.type) {
        case "i2c":
          demand.usesI2c = true
          break
        case "spi":
          demand.usesSpi = true
          demand.digital += Math.max(iface.pinCount - SPI_SHARED_PINS, 0) * item.quantity
          break
        case "analog_in":
          demand.analog += pins
          break
        case "pwm":
          demand.pwm += pins
          demand.digital += pins
          break
        case "uart":
          demand.uarts += item.quantity
          demand.digital += pins
          break
        default:
          demand.digital += pins
      }
    }
  }

  if (demand.usesI2c) {
    demand.digital += I2C_BUS_PINS
  }
  if (demand.usesSpi) {
    demand.digital += SPI_SHARED_PINS
  }

  return demand
}

function itemIds(items: KitItemSnapshot[] | undefined): string[] {
  return [...new Set((items ?? []).map((item) => item.itemId))]
}

export const r6PinBudget: CompatibilityRule = {
  id: "R6",
  name: "Kontaktų ir sąsajų pakankamumas",
  description:
    "Komponentų reikalaujami kontaktai ir sąsajos (GPIO, analoginiai, PWM, UART, I2C, SPI) neturi viršyti mikrovaldiklio galimybių.",

  evaluate(kit: KitSnapshot): RuleResult[] {
    const mcuItem = kit.items.find((item) => item.spec.category === "mcu_board" && item.spec.mcu)
    if (!mcuItem) {
      return []
    }
    const mcu: McuCapabilities = mcuItem.spec.mcu!
    const peripherals = kit.items.filter((item) => item !== mcuItem)
    const demand = calculateDemand(peripherals)
    const results: RuleResult[] = []

    const fail = (
      message: string,
      explanation: string,
      involved: KitItemSnapshot[] | undefined,
      suggestion: string
    ) =>
      results.push({
        ruleId: this.id,
        severity: "error",
        message,
        explanation,
        involvedItemIds: [...itemIds(involved), mcuItem.itemId],
        suggestion: { text: suggestion },
        source: mcuItem.spec.datasheetUrl,
      })

    if (demand.usesI2c && mcu.i2cBuses === 0) {
      fail(
        `„${mcuItem.spec.title}“ neturi I2C magistralės, o rinkinyje yra I2C įrenginių.`,
        "I2C įrenginiai be aparatinės ar programinės I2C magistralės neveiks.",
        demand.byItem.get("i2c"),
        "Rinkitės plokštę su I2C arba kitos sąsajos modulį."
      )
    }
    if (demand.usesSpi && mcu.spiBuses === 0) {
      fail(
        `„${mcuItem.spec.title}“ neturi SPI magistralės, o rinkinyje yra SPI įrenginių.`,
        "SPI įrenginiams reikia SCK, MOSI, MISO linijų.",
        demand.byItem.get("spi"),
        "Rinkitės plokštę su SPI."
      )
    }
    if (demand.uarts > mcu.uarts) {
      fail(
        `Reikia ${demand.uarts} UART sąsajų, o „${mcuItem.spec.title}“ turi ${mcu.uarts}.`,
        "Kiekvienam UART įrenginiui reikia atskiros serijinės sąsajos (RX/TX pora). Aparatinio UART dažnai nelieka ir programavimui per USB.",
        demand.byItem.get("uart"),
        "Rinkitės plokštę su daugiau UART (ESP32 turi 3) arba naudokite programinį UART lėtiems įrenginiams."
      )
    }
    if (demand.analog > mcu.analogInputs) {
      fail(
        `Reikia ${demand.analog} analoginių įėjimų, o „${mcuItem.spec.title}“ turi ${mcu.analogInputs}.`,
        "Analoginiai jutikliai negali dalintis vienu ADC kanalu be multiplekserio.",
        demand.byItem.get("analog_in"),
        "Pridėkite analoginį multiplekserį (CD74HC4067) arba rinkitės plokštę su daugiau ADC kanalų."
      )
    }
    if (demand.pwm > mcu.pwmPins) {
      fail(
        `Reikia ${demand.pwm} PWM išėjimų, o „${mcuItem.spec.title}“ turi ${mcu.pwmPins}.`,
        "Servo varikliams ir ryškumo valdymui reikia aparatinio PWM kanalo kiekvienam.",
        demand.byItem.get("pwm"),
        "Naudokite PWM valdiklį (PCA9685, 16 kanalų per I2C)."
      )
    }
    if (demand.digital > mcu.digitalPins) {
      fail(
        `Reikia ${demand.digital} skaitmeninių kontaktų, o „${mcuItem.spec.title}“ turi ${mcu.digitalPins}.`,
        "Skaičiuojami visi skaitmeniniai kontaktai: GPIO, PWM, UART, 1-Wire, bendra I2C magistralė (2) ir SPI (3 + CS kiekvienam įrenginiui).",
        peripherals.filter((item) => item.spec.interfaces.length > 0),
        "Perkelkite dalį įrenginių į I2C (plėtikliai PCF8574, MCP23017) arba rinkitės plokštę su daugiau GPIO."
      )
    }

    return results
  },
}
