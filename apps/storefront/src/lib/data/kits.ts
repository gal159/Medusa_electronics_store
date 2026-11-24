"use server"

import { revalidateTag } from "next/cache"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import type { KitItemInput, ValidateKitResponse } from "@modules/configurator/types"

import { getOrSetCart } from "./cart"
import { getAuthHeaders, getCacheTag } from "./cookies"

/** Gyva patikra konfigūratoriuje. Nieko neišsaugo. */
export async function validateKit(items: KitItemInput[]): Promise<ValidateKitResponse> {
  const headers = { ...(await getAuthHeaders()) }

  return sdk.client
    .fetch<ValidateKitResponse>("/store/kits/validate", {
      method: "POST",
      body: { items },
      headers,
      cache: "no-store",
    })
    .catch(medusaError)
}

type CreateKitResponse = {
  kit: { id: string; name: string; status: string }
  validation: ValidateKitResponse
}

/**
 * Išsaugo rinkinį ir sudeda jo eilutes į krepšelį (su metadata.kit_id).
 * Grąžina rinkinio id ir paskutinę patikrą, kad UI galėtų parodyti būseną.
 */
export async function saveKitAndAddToCart({
  name,
  items,
  countryCode,
}: {
  name: string
  items: KitItemInput[]
  countryCode: string
}): Promise<CreateKitResponse> {
  const headers = { ...(await getAuthHeaders()) }

  const created = await sdk.client
    .fetch<CreateKitResponse>("/store/kits", {
      method: "POST",
      body: { name, items },
      headers,
      cache: "no-store",
    })
    .catch(medusaError)

  const cart = await getOrSetCart(countryCode)
  if (!cart) {
    throw new Error("Nepavyko sukurti krepšelio")
  }

  const added = await sdk.client
    .fetch<CreateKitResponse>(`/store/kits/${created.kit.id}/add-to-cart`, {
      method: "POST",
      body: { cart_id: cart.id },
      headers,
      cache: "no-store",
    })
    .catch(medusaError)

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag, { expire: 0 })
  const fulfillmentCacheTag = await getCacheTag("fulfillment")
  revalidateTag(fulfillmentCacheTag, { expire: 0 })

  return { kit: added.kit, validation: added.validation }
}
