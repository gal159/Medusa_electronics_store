/**
 * Pradiniai parduotuvės duomenys. Vykdoma vieną kartą per `medusa db:migrate`
 * (Medusa seka įvykdytus migration-scripts, todėl pakartotinai nesileidžia).
 *
 * Sukuria: pardavimo kanalą, publishable API raktą, parduotuvę (EUR),
 * regioną „Lietuva“, mokesčių regioną LT, Vilniaus sandėlį, pristatymo
 * variantus ir produktų kategorijas pagal komponentų tipus
 * (`src/lib/component-categories.ts`). Pačius komponentus kuria
 * `src/scripts/seed-components.ts` (`medusa exec`), kad katalogą būtų
 * galima perkrauti nepriklausomai nuo migracijų.
 */
import { MedusaContainer } from "@medusajs/framework"
import { DEFAULT_REGION_STORE_POLICIES } from "../lib/region-store-policies"
import { COMPONENT_CATEGORIES } from "../lib/component-categories"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createProductCategoriesWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"

const COUNTRY_CODE = "lt"
const CURRENCY_CODE = "eur"

export default async function initialDataSeed({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  )

  logger.info("Kuriami parduotuvės duomenys...")
  const {
    result: [defaultSalesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        {
          name: "Internetinė parduotuvė",
          description: "Pagrindinis pardavimo kanalas (storefront)",
        },
      ],
    },
  })

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: "Storefront publishable key",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  })

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel.id],
    },
  })

  await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: "Elektronikos komponentų parduotuvė",
          supported_currencies: [
            {
              currency_code: CURRENCY_CODE,
              is_default: true,
            },
          ],
          default_sales_channel_id: defaultSalesChannel.id,
        },
      ],
    },
  })

  logger.info("Kuriamas regionas...")
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Lietuva",
          currency_code: CURRENCY_CODE,
          countries: [COUNTRY_CODE],
          payment_providers: ["pp_system_default"],
          metadata: DEFAULT_REGION_STORE_POLICIES,
        },
      ],
    },
  })
  const region = regionResult[0]

  // Mokesčių regionas be tarifo: dev aplinkoje kainos rodomos be PVM.
  // PVM 21 % tarifą galima pridėti admin'e (Settings -> Tax Regions).
  await createTaxRegionsWorkflow(container).run({
    input: [
      {
        country_code: COUNTRY_CODE,
        provider_id: "tp_system",
      },
    ],
  })

  logger.info("Kuriamas sandėlis ir pristatymas...")
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Vilniaus sandėlis",
          address: {
            city: "Vilnius",
            country_code: COUNTRY_CODE.toUpperCase(),
            address_1: "",
          },
        },
      ],
    },
  })
  const stockLocation = stockLocationResult[0]

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  })

  // Numatytąjį shipping profile sukuria Medusa core migracija.
  const { data: shippingProfileResult } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfile = shippingProfileResult[0]

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Pristatymas Lietuvoje",
    type: "shipping",
    service_zones: [
      {
        name: "Lietuva",
        geo_zones: [
          {
            country_code: COUNTRY_CODE,
            type: "country",
          },
        ],
      },
    ],
  })

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  })

  const storefrontOnlyRules = [
    {
      attribute: "enabled_in_store",
      value: "true",
      operator: "eq" as const,
    },
    {
      attribute: "is_return",
      value: "false",
      operator: "eq" as const,
    },
  ]

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standartinis pristatymas",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standartinis",
          description: "Pristatymas per 2-3 darbo dienas.",
          code: "standard",
        },
        prices: [
          {
            currency_code: CURRENCY_CODE,
            amount: DEFAULT_REGION_STORE_POLICIES.shipping_rate,
          },
          {
            region_id: region.id,
            amount: DEFAULT_REGION_STORE_POLICIES.shipping_rate,
          },
        ],
        rules: storefrontOnlyRules,
      },
      {
        name: "Atsiėmimas Vilniuje",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Atsiėmimas",
          description: "Nemokamas atsiėmimas sandėlyje kitą darbo dieną.",
          code: "pickup",
        },
        prices: [
          {
            currency_code: CURRENCY_CODE,
            amount: 0,
          },
          {
            region_id: region.id,
            amount: 0,
          },
        ],
        rules: storefrontOnlyRules,
      },
    ],
  })

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel.id],
    },
  })

  logger.info("Kuriamos komponentų kategorijos...")
  await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: COMPONENT_CATEGORIES.map((category, index) => ({
        name: category.name,
        handle: category.handle,
        description: category.description,
        is_active: true,
        rank: index,
        metadata: { spec_category: category.specCategory },
      })),
    },
  })

  logger.info("Pradiniai parduotuvės duomenys sukurti.")
}
