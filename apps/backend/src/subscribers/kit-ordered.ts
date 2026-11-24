import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { KIT_MODULE } from "../modules/kit"
import type KitModuleService from "../modules/kit/service"

/**
 * Po užsakymo rinkiniai, kurių eilutės pateko į užsakymą (metadata.kit_id),
 * pažymimi `ordered`. Tai leidžia pirkėjui atskirti išsaugotus ir užsakytus
 * rinkinius, o 5 uždavinio testavimui – susieti užsakymą su patikros rezultatu.
 */
export default async function kitOrderedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const kitService = container.resolve<KitModuleService>(KIT_MODULE)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "items.metadata"],
    filters: { id: data.id },
  })

  const kitIds = new Set<string>()
  for (const item of orders[0]?.items ?? []) {
    const kitId = (item?.metadata as Record<string, unknown> | null | undefined)?.kit_id
    if (typeof kitId === "string" && kitId) {
      kitIds.add(kitId)
    }
  }

  if (!kitIds.size) {
    return
  }

  await kitService.updateKits({
    selector: { id: [...kitIds] },
    data: { status: "ordered" },
  })
  logger.info(`Užsakymas ${data.id}: rinkiniai pažymėti ordered (${[...kitIds].join(", ")})`)
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
