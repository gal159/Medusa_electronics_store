import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { evaluateKit } from "../../modules/compatibility/engine"
import type { ValidationReport } from "../../modules/compatibility/engine"
import { buildKitSnapshot, type KitItemInput } from "../../modules/compatibility/snapshot"

/**
 * Užsakymo blokavimas: krepšelis su rinkiniu, kuriame yra `error`, negali
 * būti užbaigtas. `completeCartWorkflow` `validate` hook'as vykdomas
 * prieš sukuriant užsakymą ir autorizuojant mokėjimą; išmesta klaida sustabdo
 * workflow, o krepšelis lieka nepakitęs.
 *
 * Rinkinys atpažįstamas pagal eilučių `metadata.kit_id` (įrašo add-kit-to-cart).
 * Patikra vykdoma iš naujo, nes specifikacijos ar kiekiai galėjo pasikeisti po
 * įdėjimo į krepšelį. Pavieniai komponentai be kit_id netikrinami: pirkėjas
 * gali pirkti atskiras dalis savo nuožiūra.
 */

export type CartLineForKit = {
  id: string
  variant_id: string | null
  quantity: number
  metadata?: Record<string, unknown> | null
}

export type KitGroup = {
  kitId: string
  kitName: string
  items: KitItemInput[]
}

export function groupCartLinesByKit(lines: CartLineForKit[]): KitGroup[] {
  const groups = new Map<string, KitGroup>()
  for (const line of lines) {
    const kitId = line.metadata?.kit_id
    if (typeof kitId !== "string" || !kitId || !line.variant_id) {
      continue
    }
    const group = groups.get(kitId) ?? {
      kitId,
      kitName: typeof line.metadata?.kit_name === "string" ? line.metadata.kit_name : kitId,
      items: [],
    }
    group.items.push({ variant_id: line.variant_id, quantity: line.quantity })
    groups.set(kitId, group)
  }
  return [...groups.values()]
}

export type BlockingKit = { kitName: string; errors: string[] }

/** Grynas rezultatų apdorojimas: kurie rinkiniai turi klaidų ir kokių. */
export function findBlockingKits(
  groups: KitGroup[],
  reports: Map<string, ValidationReport>
): BlockingKit[] {
  return groups.flatMap((group) => {
    const report = reports.get(group.kitId)
    if (!report || report.isOrderable) {
      return []
    }
    return [
      {
        kitName: group.kitName,
        errors: report.results
          .filter((result) => result.severity === "error")
          .map((result) => `${result.ruleId}: ${result.message}`),
      },
    ]
  })
}

export function formatBlockingMessage(blocking: BlockingKit[]): string {
  const details = blocking
    .map((kit) => `„${kit.kitName}“: ${kit.errors.join(" ")}`)
    .join(" | ")
  return `Užsakymo užbaigti negalima: rinkinys turi suderinamumo klaidų. ${details} Pataisykite rinkinį konfigūratoriuje.`
}

export async function assertCartKitsOrderable(container: MedusaContainer, cartId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "items.id", "items.variant_id", "items.quantity", "items.metadata"],
    filters: { id: cartId },
  })
  const lines = (data[0]?.items ?? []) as CartLineForKit[]
  const groups = groupCartLinesByKit(lines)
  if (!groups.length) {
    return
  }

  const reports = new Map<string, ValidationReport>()
  for (const group of groups) {
    const { snapshot } = await buildKitSnapshot(container, group.items)
    reports.set(group.kitId, evaluateKit(snapshot))
  }

  const blocking = findBlockingKits(groups, reports)
  if (blocking.length) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, formatBlockingMessage(blocking))
  }
}

completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  await assertCartKitsOrderable(container, cart.id)
})
