"use server"

import { sdk } from "@lib/config"
import type { HttpTypes } from "@medusajs/types"
import type {
  ConfiguratorCategory,
  ConfiguratorProduct,
  KitPreset,
} from "@modules/configurator/types"

import { getAuthHeaders, getCatalogCacheOptions } from "./cookies"
import { getRegion } from "./regions"

const PRODUCT_FIELDS =
  "id,title,handle,subtitle,thumbnail,variants.id,variants.title,*variants.calculated_price,*categories"

type StoreCategory = HttpTypes.StoreProductCategory & {
  metadata?: Record<string, unknown> | null
}

/**
 * Visas katalogas konfigūratoriui (iki 100 produktų) su kainomis regionui ir
 * kategorijomis. Kiekvienas variantas grąžinamas atskiru įrašu (žr. žemiau).
 */
export async function listConfiguratorData(countryCode: string): Promise<{
  products: ConfiguratorProduct[]
  categories: ConfiguratorCategory[]
}> {
  const region = await getRegion(countryCode)
  if (!region) {
    return { products: [], categories: [] }
  }

  const headers = { ...(await getAuthHeaders()) }

  const [{ products }, { product_categories }] = await Promise.all([
    sdk.client.fetch<{ products: HttpTypes.StoreProduct[] }>("/store/products", {
      method: "GET",
      query: { limit: 100, region_id: region.id, fields: PRODUCT_FIELDS },
      headers,
      next: await getCatalogCacheOptions("products"),
      cache: "force-cache",
    }),
    sdk.client.fetch<{ product_categories: StoreCategory[] }>("/store/product-categories", {
      method: "GET",
      query: { limit: 100, fields: "id,name,handle,description,rank,metadata" },
      headers,
      next: await getCatalogCacheOptions("categories"),
      cache: "force-cache",
    }),
  ])

  // Vienas įrašas kiekvienam variantui: rinkinys ir patikra dirba su variantais
  // (pvz., maitinimo šaltinio 2 A ir 10 A yra skirtingi bėgeliai). Kortelėje
  // jie grupuojami pagal prekę (`id`). Variantai rikiuojami pagal kainą, kad
  // pasirinkimų sąrašas eitų nuo mažiausio (2 A) iki didžiausio (10 A).
  const configuratorProducts: ConfiguratorProduct[] = products.flatMap((product) => {
    const variants = [...(product.variants ?? [])].sort(
      (a, b) =>
        (a.calculated_price?.calculated_amount ?? 0) - (b.calculated_price?.calculated_amount ?? 0)
    )
    const hasChoice = variants.length > 1

    return variants.map((variant) => ({
      id: product.id,
      title: product.title,
      handle: product.handle,
      subtitle: product.subtitle ?? null,
      thumbnail: product.thumbnail ?? null,
      variantId: variant.id,
      variantTitle: hasChoice ? variant.title ?? null : null,
      priceAmount: variant.calculated_price?.calculated_amount ?? null,
      currencyCode: region.currency_code,
      categoryIds: (product.categories ?? []).map((category) => category.id),
    }))
  })

  const categories: ConfiguratorCategory[] = product_categories
    .slice()
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .map((category) => ({
      id: category.id,
      name: category.name,
      handle: category.handle,
      description: category.description ?? null,
      specCategory:
        typeof category.metadata?.spec_category === "string"
          ? category.metadata.spec_category
          : null,
    }))

  return { products: configuratorProducts, categories }
}

/** Rinkinių šablonai (GET /store/kit-presets). Klaida neturi sugadinti konfigūratoriaus. */
export async function listKitPresets(): Promise<KitPreset[]> {
  const headers = { ...(await getAuthHeaders()) }
  return sdk.client
    .fetch<{ presets: KitPreset[] }>("/store/kit-presets", {
      method: "GET",
      headers,
      next: await getCatalogCacheOptions("kit-presets"),
      cache: "force-cache",
    })
    .then(({ presets }) => presets)
    .catch(() => [])
}
