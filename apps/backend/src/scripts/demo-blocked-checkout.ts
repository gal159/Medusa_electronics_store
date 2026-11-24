/**
 * Demo: parodo užsakymo blokavimą rinkiniui su klaidomis be storefront UI
 * (UI neleidžia išsaugoti tokio rinkinio, todėl krepšelis sudaromas tiesiogiai).
 *
 *   npx medusa exec ./src/scripts/demo-blocked-checkout.ts
 *
 * Sukuria krepšelį su Uno + 3× 28BYJ-48 (R4 klaida), užpildo adresą, pristatymą
 * ir sisteminį mokėjimą, tada bando užbaigti. Laukiamas rezultatas: klaida iš
 * `validate-cart-kits` hook'o. Nieko nepalieka užsakymuose.
 */
import {
  addShippingMethodToCartWorkflow,
  completeCartWorkflow,
  createCartWorkflow,
  createPaymentCollectionForCartWorkflow,
  createPaymentSessionsWorkflow,
  listShippingOptionsForCartWorkflow,
  updateCartWorkflow,
} from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { addKitToCartWorkflow } from "../workflows/kit/add-kit-to-cart"
import { createKitWorkflow } from "../workflows/kit/create-kit"

const KIT_HANDLES: Array<[string, number]> = [
  ["arduino-uno-r3", 1],
  ["28byj-48-uln2003", 3],
]

export default async function demoBlockedCheckout({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: regions } = await query.graph({ entity: "region", fields: ["id", "name"] })
  const { data: salesChannels } = await query.graph({ entity: "sales_channel", fields: ["id"] })
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product.handle"],
    filters: { product: { handle: KIT_HANDLES.map(([handle]) => handle) } },
  })
  const variantByHandle = new Map(
    variants.map((variant) => [variant.product?.handle ?? "", variant.id])
  )

  const items = KIT_HANDLES.map(([handle, quantity]) => ({
    variant_id: variantByHandle.get(handle)!,
    quantity,
  }))

  const { result: created } = await createKitWorkflow(container).run({
    input: { name: "Demo: robotas su 3 varikliais", items },
  })
  logger.info(
    `Rinkinys ${created.kit.id}: ${created.validation.report.summary.errors} klaida(-os), isOrderable=${created.validation.report.isOrderable}`
  )

  const { result: cart } = await createCartWorkflow(container).run({
    input: {
      region_id: regions[0].id,
      sales_channel_id: salesChannels[0].id,
      email: "demo@example.com",
      currency_code: "eur",
    },
  })

  await addKitToCartWorkflow(container).run({
    input: { kit_id: created.kit.id, cart_id: cart.id },
  })

  const address = {
    first_name: "Demo",
    last_name: "Pirkėjas",
    address_1: "Gedimino pr. 1",
    city: "Vilnius",
    postal_code: "01103",
    country_code: "lt",
  }
  await updateCartWorkflow(container).run({
    input: { id: cart.id, shipping_address: address, billing_address: address },
  })

  const { result: shippingOptions } = await listShippingOptionsForCartWorkflow(container).run({
    input: { cart_id: cart.id },
  })
  await addShippingMethodToCartWorkflow(container).run({
    input: { cart_id: cart.id, options: [{ id: shippingOptions[0].id }] },
  })

  const { result: paymentCollection } = await createPaymentCollectionForCartWorkflow(container).run({
    input: { cart_id: cart.id },
  })
  await createPaymentSessionsWorkflow(container).run({
    input: { payment_collection_id: paymentCollection.id, provider_id: "pp_system_default" },
  })

  logger.info(`Krepšelis ${cart.id} paruoštas, bandome užbaigti...`)

  try {
    await completeCartWorkflow(container).run({ input: { id: cart.id } })
    logger.error("NETIKĖTA: užsakymas sukurtas, blokavimas nesuveikė")
  } catch (error) {
    logger.info(`UŽSAKYMAS UŽBLOKUOTAS: ${(error as Error).message}`)
  }
}
