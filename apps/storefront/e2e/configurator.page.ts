import { expect, type Locator, type Page } from "@playwright/test"

/** Konfigūratoriaus puslapio objektas: veiksmai pagal data-testid, ne pagal tekstą. */
export class ConfiguratorPage {
  constructor(readonly page: Page) {}

  async open() {
    await this.page.goto("/lt/configurator")
    await expect(this.page.getByTestId("configurator")).toBeVisible()
  }

  async selectCategory(handle: string) {
    await this.page.getByTestId(`category-${handle}`).click()
  }

  component(handle: string): Locator {
    return this.page.getByTestId(`component-${handle}`)
  }

  /** Prideda komponentą `quantity` kartų (pirmas paspaudimas „Pridėti“, toliau „+“). */
  async add(categoryHandle: string, productHandle: string, quantity = 1) {
    await this.selectCategory(categoryHandle)
    const card = this.component(productHandle)
    await card.getByTestId("add-component").click()
    for (let i = 1; i < quantity; i++) {
      await card.getByRole("button", { name: "Padidinti kiekį" }).click()
    }
    await expect(card.getByTestId("quantity")).toHaveText(String(quantity))
  }

  /** Kelių variantų prekėje pasirenka variantą pagal pavadinimą (pvz., „5 A“). */
  async selectVariant(categoryHandle: string, productHandle: string, variantTitle: string) {
    await this.selectCategory(categoryHandle)
    const select = this.component(productHandle).getByTestId("variant-select")
    const value = await select
      .locator("option")
      .filter({ hasText: new RegExp(`^${variantTitle}`) })
      .getAttribute("value")
    await select.selectOption(value!)
  }

  async setQuantity(categoryHandle: string, productHandle: string, quantity: number) {
    await this.selectCategory(categoryHandle)
    const card = this.component(productHandle)
    const current = Number(await card.getByTestId("quantity").innerText())
    const button = quantity > current ? "Padidinti kiekį" : "Sumažinti kiekį"
    for (let i = 0; i < Math.abs(quantity - current); i++) {
      await card.getByRole("button", { name: button }).click()
    }
  }

  summary(): Locator {
    return this.page.getByTestId("validation-summary")
  }

  result(ruleId: string): Locator {
    return this.page.getByTestId(`result-${ruleId}`)
  }

  saveButton(): Locator {
    return this.page.getByTestId("save-kit")
  }

  /** Laukia, kol patikra baigsis ir santrauka parodys nurodytą skaičių klaidų. */
  async expectErrors(count: number) {
    await expect(this.summary()).toContainText(`Klaidų: ${count},`)
  }
}
