/**
 * Integracinių testų duomenys. Testų DB kuriama tuščia (be migration-scripts),
 * todėl minimalią parduotuvę ir realius komponentus su specifikacijomis
 * sukuriame tais pačiais workflow'ais kaip ir produkcijoje.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, ProductStatus, generateJwtToken } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"
import { COMPONENT_SPECS } from "../../src/lib/component-spec-data"
import { toComponentSpecInput } from "../../src/scripts/seed-component-specs"
import { createComponentSpecWorkflow } from "../../src/workflows/component-spec"

export const FIXTURE_HANDLES = [
  "esp32-devkit-v1",
  "arduino-uno-r3",
  "raspberry-pi-pico",
  "hc-sr04",
  "bme280-modulis-3v3",
  "ssd1306-oled-0-96",
  "28byj-48-uln2003",
  "lygiu-keitiklis-bss138-4ch",
] as const

export type Fixtures = {
  publishableKey: string
  regionId: string
  salesChannelId: string
  variantByHandle: Record<string, string>
  productByHandle: Record<string, string>
  adminHeaders: { headers: Record<string, string> }
  storeHeaders: { headers: Record<string, string> }
}

export async function createFixtures(container: MedusaContainer): Promise<Fixtures> {
  const {
    result: [salesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: { salesChannelsData: [{ name: "Test kanalas" }] },
  })

  const {
    result: [apiKey],
  } = await createApiKeysWorkflow(container).run({
    input: { api_keys: [{ title: "Test", type: "publishable", created_by: "" }] },
  })
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: apiKey.id, add: [salesChannel.id] },
  })

  const {
    result: [region],
  } = await createRegionsWorkflow(container).run({
    input: { regions: [{ name: "Lietuva", currency_code: "eur", countries: ["lt"] }] },
  })

  const { result: products } = await createProductsWorkflow(container).run({
    input: {
      products: FIXTURE_HANDLES.map((handle) => ({
        title: handle,
        handle,
        status: ProductStatus.PUBLISHED,
        sales_channels: [{ id: salesChannel.id }],
        options: [{ title: "Variantas", values: ["Standartinis"] }],
        variants: [
          {
            title: "Standartinis",
            sku: `TEST-${handle}`,
            manage_inventory: false,
            options: { Variantas: "Standartinis" },
            prices: [{ amount: 10, currency_code: "eur" }],
          },
        ],
      })),
    },
  })

  const variantByHandle: Record<string, string> = {}
  const productByHandle: Record<string, string> = {}
  for (const product of products) {
    variantByHandle[product.handle] = product.variants[0].id
    productByHandle[product.handle] = product.id
    await createComponentSpecWorkflow(container).run({
      input: { product_id: product.id, ...toComponentSpecInput(COMPONENT_SPECS[product.handle]) },
    })
  }

  return {
    publishableKey: apiKey.token,
    regionId: region.id,
    salesChannelId: salesChannel.id,
    variantByHandle,
    productByHandle,
    adminHeaders: { headers: await createAdminAuthHeaders(container) },
    storeHeaders: { headers: { "x-publishable-api-key": apiKey.token } },
  }
}

/** Admin naudotojas ir JWT, pasirašytas projekto `jwtSecret`. */
async function createAdminAuthHeaders(container: MedusaContainer) {
  const userModule = container.resolve(Modules.USER)
  const authModule = container.resolve(Modules.AUTH)
  const config = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE)

  const user = await userModule.createUsers({ email: "admin@test.lt" })
  const authIdentity = await authModule.createAuthIdentities({
    provider_identities: [{ provider: "emailpass", entity_id: "admin@test.lt" }],
    app_metadata: { user_id: user.id },
  })

  const token = generateJwtToken(
    {
      actor_id: user.id,
      actor_type: "user",
      auth_identity_id: authIdentity.id,
      app_metadata: { user_id: user.id },
    },
    { secret: config.projectConfig.http.jwtSecret, expiresIn: "1d" }
  )

  return { authorization: `Bearer ${token}` }
}
