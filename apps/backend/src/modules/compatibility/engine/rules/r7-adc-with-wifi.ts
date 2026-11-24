import type { CompatibilityRule, KitSnapshot, RuleResult } from "../types"

/**
 * R7. Analoginiai įėjimai su Wi-Fi.
 * ESP32 ADC2 kanalus naudoja Wi-Fi tvarkyklė (ESP-IDF, ADC Oneshot
 * „Hardware Limitations“), todėl veikiant Wi-Fi patikimai lieka tik ADC1.
 * Jei analoginių įėjimų poreikis viršija `analogInputsUsableWithWifi`, bet
 * neviršija bendro `analogInputs`, tai įspėjimas (R6 jau pagauna visišką trūkumą).
 */
export const r7AdcWithWifi: CompatibilityRule = {
  id: "R7",
  name: "Analoginiai įėjimai su Wi-Fi",
  description:
    "Wi-Fi plokštėse dalis ADC kanalų nenaudotina veikiant radijui; analoginių jutiklių skaičius lyginamas su likusiais kanalais.",

  evaluate(kit: KitSnapshot): RuleResult[] {
    const mcuItem = kit.items.find((item) => item.spec.category === "mcu_board" && item.spec.mcu)
    const mcu = mcuItem?.spec.mcu
    if (!mcuItem || !mcu || !mcu.hasWifi || mcu.analogInputsUsableWithWifi === null) {
      return []
    }

    const analogItems = kit.items.filter(
      (item) => item !== mcuItem && item.spec.interfaces.some((iface) => iface.type === "analog_in")
    )
    const needed = analogItems.reduce(
      (sum, item) =>
        sum +
        item.spec.interfaces
          .filter((iface) => iface.type === "analog_in")
          .reduce((pins, iface) => pins + iface.pinCount * item.quantity, 0),
      0
    )

    if (needed <= mcu.analogInputsUsableWithWifi || needed > mcu.analogInputs) {
      return []
    }

    return [
      {
        ruleId: this.id,
        severity: "warning",
        message: `Reikia ${needed} analoginių įėjimų, o veikiant Wi-Fi „${mcuItem.spec.title}“ patikimai turi ${mcu.analogInputsUsableWithWifi} (iš viso ${mcu.analogInputs}).`,
        explanation:
          "ESP32 ADC2 kanalai dalijami su Wi-Fi: įjungus Wi-Fi jų rodmenys nepatikimi arba neprieinami. Jei projektas naudoja Wi-Fi, analoginius jutiklius junkite prie ADC1 (GPIO32–39) arba pridėkite išorinį ADC.",
        involvedItemIds: [...analogItems.map((item) => item.itemId), mcuItem.itemId],
        suggestion: {
          text: "Naudokite išorinį I2C ADC (pvz., ADS1115) arba mažiau analoginių jutiklių, jei reikia Wi-Fi.",
        },
        source: "https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/adc/adc_oneshot.html",
      },
    ]
  },
}
