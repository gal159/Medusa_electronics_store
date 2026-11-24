import { expect, test } from "@playwright/test"
import { ConfiguratorPage } from "./configurator.page"

/**
 * Konfigūratoriaus E2E scenarijai (FR-4, FR-5, FR-6, FR-7, FR-9).
 * Kiekvienas testas gauna naują naršyklės kontekstą, todėl ir tuščią krepšelį.
 */

test.describe("Rinkinio konfigūratorius", () => {
  test("A: ESP32 + HC-SR04 → R3 klaida; pasiūlymas pašalina blokavimą; rinkinys į krepšelį", async ({ page }) => {
    const configurator = new ConfiguratorPage(page)
    await configurator.open()

    await configurator.add("mikrovaldikliai", "esp32-devkit-v1")
    await configurator.add("jutikliai", "hc-sr04")

    await configurator.expectErrors(1)
    const r3 = configurator.result("R3")
    await expect(r3).toContainText("Klaida")
    await expect(r3).toContainText("5 V")
    await expect(configurator.saveButton()).toBeDisabled()

    await r3.getByTestId("apply-suggestion").click()

    await configurator.expectErrors(0)
    await expect(configurator.summary()).toContainText("Rinkinys suderinamas")
    await expect(configurator.result("R3")).toContainText("Informacija")
    await expect(configurator.saveButton()).toBeEnabled()

    await page.getByTestId("kit-name").fill("E2E atstumo matuoklis")
    await configurator.saveButton().click()

    await page.waitForURL("**/lt/cart")
    const rows = page.getByTestId("product-row")
    await expect(rows).toHaveCount(3)
    await expect(page.getByTestId("product-kit").first()).toHaveText("Rinkinys: E2E atstumo matuoklis")
  })

  test("B: Pico + 2× BME280 → R5 įspėjimas su adresu 0x77; 2× SSD1306 → R5 klaida", async ({ page }) => {
    const configurator = new ConfiguratorPage(page)
    await configurator.open()

    await configurator.add("mikrovaldikliai", "raspberry-pi-pico")
    await configurator.add("jutikliai", "bme280-modulis-3v3", 2)

    await configurator.expectErrors(0)
    await expect(configurator.result("R5")).toContainText("Įspėjimas")
    await expect(configurator.result("R5")).toContainText("0x77")
    await expect(configurator.saveButton()).toBeEnabled()

    await configurator.add("ekranai", "ssd1306-oled-0-96", 2)

    await configurator.expectErrors(1)
    await expect(configurator.page.getByTestId("result-R5").filter({ hasText: "0x3C" })).toContainText("Klaida")
    await expect(configurator.saveButton()).toBeDisabled()
  })

  test("C: Uno + 28BYJ-48: 2 vnt. įspėjimas 86 %, 3 vnt. R4 klaida, 4 vnt. ir R6 klaida", async ({ page }) => {
    const configurator = new ConfiguratorPage(page)
    await configurator.open()

    await configurator.add("mikrovaldikliai", "arduino-uno-r3")
    await configurator.add("pavaros", "28byj-48-uln2003", 2)

    await configurator.expectErrors(0)
    await expect(configurator.result("R4")).toContainText("86 %")

    await configurator.setQuantity("pavaros", "28byj-48-uln2003", 3)
    await configurator.expectErrors(1)
    await expect(configurator.result("R4")).toContainText("645 mA")

    await configurator.setQuantity("pavaros", "28byj-48-uln2003", 4)
    await configurator.expectErrors(2)
    await expect(configurator.result("R6")).toContainText("16")
    await expect(configurator.saveButton()).toBeDisabled()
  })

  test("D: Uno + 3× 28BYJ-48 perkrauna USB; 5 V 5 A maitinimo šaltinis klaidą pašalina", async ({ page }) => {
    const configurator = new ConfiguratorPage(page)
    await configurator.open()

    await configurator.add("mikrovaldikliai", "arduino-uno-r3")
    await configurator.add("pavaros", "28byj-48-uln2003", 3)
    await configurator.expectErrors(1)
    await expect(configurator.result("R4")).toContainText("5V (USB)")

    await configurator.selectVariant("maitinimas", "led-maitinimo-saltinis-5v", "5 A")
    await configurator.add("maitinimas", "led-maitinimo-saltinis-5v")

    await configurator.expectErrors(0)
    await expect(page.getByTestId("kit-summary")).toContainText("LED maitinimo šaltinis 5 V (5 A)")
    await expect(configurator.saveButton()).toBeEnabled()
  })

  test("E: LED šablonas – 4 m WS2812B → „Persilpnas“, „Pakeisti“ į 10 A; 12 V COB → R2 ir R9", async ({ page }) => {
    const configurator = new ConfiguratorPage(page)
    await configurator.open()

    await page.getByTestId("apply-preset-led-rinkinys").click()
    await configurator.expectErrors(0)

    const psu = page.getByTestId("slot-psu")
    const strip = page.getByTestId("slot-strip")
    await expect(psu.getByTestId("slot-status")).toHaveText("Tinka")

    // 4 m × 2 200 mA = 8 800 mA > 6 000 mA (5 V 6 A)
    await strip.getByRole("button", { name: "Padidinti kiekį" }).click()
    await strip.getByRole("button", { name: "Padidinti kiekį" }).click()
    await expect(strip.getByTestId("quantity")).toHaveText("4")
    await configurator.expectErrors(1)
    await expect(psu.getByTestId("slot-status")).toHaveText("Persilpnas")
    await expect(configurator.result("R4")).toContainText("8 800 mA")
    await expect(configurator.saveButton()).toBeDisabled()

    await psu.getByTestId("slot-apply-upgrade").click()
    await configurator.expectErrors(0)
    await expect(psu.getByTestId("slot-variant").locator("option:checked")).toHaveText(/^10 A/)
    await expect(strip.getByTestId("quantity")).toHaveText("4")
    await expect(configurator.saveButton()).toBeEnabled()

    // Valdiklio pozicija išsiskleidžia į korteles su nuotraukomis (ar vietos ženklu)
    const controller = page.getByTestId("slot-controller")
    await controller.getByTestId("slot-toggle").click()
    const options = page.getByTestId("slot-options")
    await expect(options.getByRole("group").getByRole("button")).toHaveCount(5)
    await expect(options.getByTestId("slot-option-arduino-uno-r3")).toHaveAttribute("aria-pressed", "true")
    await options.getByTestId("slot-option-esp32-devkit-v1").click()
    await expect(options).toBeHidden()
    await expect(controller.getByTestId("slot-selected")).toHaveText(/ESP32 DevKit V1/)
    await configurator.expectErrors(0)

    // Vienos spalvos 12 V juosta su 5 V šaltiniu: trūksta 12 V bėgelio ir dimerio
    await strip.getByTestId("slot-toggle").click()
    await page.getByTestId("slot-options").getByTestId("slot-option-cob-juosta-12v").click()
    await expect(strip.getByTestId("quantity")).toHaveText("4")
    await expect(configurator.result("R2")).toContainText("12 V")
    await expect(configurator.result("R9")).toContainText("dimerio")
    await expect(configurator.saveButton()).toBeDisabled()

    // ESP32 niekam kitam nereikalingas: vienos spalvos juostai siūloma jį pakeisti dimeriu
    await expect(controller.getByTestId("slot-apply-upgrade")).toBeVisible()
    await controller.getByTestId("slot-apply-upgrade").click()
    await expect(controller.getByTestId("slot-selected")).toHaveText(/dimeris/)
    await expect(configurator.result("R9")).toHaveCount(0)
    await expect(configurator.result("R1")).toHaveCount(0)
    // Lieka tik R2: 12 V juostai reikia 12 V šaltinio; 5 V šaltinio niekas kitas nenaudoja → keičiamas
    await expect(configurator.result("R2")).toContainText("12 V")
    await expect(psu.getByTestId("slot-status")).toHaveText("Klaida (R2)")
    await psu.getByTestId("slot-apply-upgrade").click()
    await expect(psu.getByTestId("slot-selected")).toHaveText(/12 V \(2 A\)/)
    await expect(configurator.result("R2")).toHaveCount(0)

    // 4 m × 917 mA = 3 668 mA > 2 A → „Persilpnas“, mažiausias tinkamas variantas 5 A (≤ 80 %)
    await expect(psu.getByTestId("slot-status")).toHaveText("Persilpnas")
    await psu.getByTestId("slot-apply-upgrade").click()
    await expect(psu.getByTestId("slot-selected")).toHaveText(/12 V \(5 A\)/)
    await configurator.expectErrors(0)
    await expect(configurator.saveButton()).toBeEnabled()
  })

  test("Tuščias rinkinys: patikros nėra, mygtukas neaktyvus", async ({ page }) => {
    const configurator = new ConfiguratorPage(page)
    await configurator.open()

    await expect(page.getByTestId("validation-panel")).toContainText("Pridėkite komponentų")
    await expect(configurator.saveButton()).toBeDisabled()
  })
})
