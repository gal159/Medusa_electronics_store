/**
 * Atnaujina jau sukurtą katalogo prekę pagal duomenis kode:
 *  - pavadinimą, paantraštę ir aprašymą iš `seed-components.ts` (COMPONENTS);
 *  - techninę specifikaciją iš `src/lib/component-spec-data.ts`.
 *
 *   npx medusa exec ./src/scripts/sync-catalog-entry.ts <handle> [<handle> ...]
 *
 * Seed'ai esamų prekių nekeičia (kad nebūtų perrašyti admin'e padaryti
 * pakeitimai), todėl pataisius vienos prekės duomenis kode jie perkeliami
 * į DB šiuo skriptu – tik nurodytoms prekėms. Variantai, kainos ir
 * nuotraukos neliečiami.
 */
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

import { COMPONENT_SPECS } from "../lib/component-spec-data"
import { createComponentSpecWorkflow, updateComponentSpecWorkflow } from "../workflows/component-spec"
import { toComponentSpecInput } from "./seed-component-specs"
import { COMPONENTS } from "./seed-components"

export default async function syncCatalogEntry({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const handles = args ?? []
  if (!handles.length) {
    logger.error("Nurodykite bent vieną prekės handle, pvz.: led-dimeris-vienos-spalvos")
    return
  }

  for (const handle of handles) {
    const component = COMPONENTS.find((entry) => entry.handle === handle)
    const specData = COMPONENT_SPECS[handle]

    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "handle", "component_spec.id"],
      filters: { handle },
    })
    // Link'o laukas į sugeneruotus Query tipus patenka tik po build, todėl tipas nurodomas rankomis.
    const product = (data as Array<{ id: string; component_spec?: { id: string } | null }>)[0]

    if (!product) {
      logger.warn(`${handle}: prekės DB nėra (pirma paleiskite seed).`)
      continue
    }

    if (component) {
      await updateProductsWorkflow(container).run({
        input: {
          selector: { id: product.id },
          update: {
            title: component.title,
            subtitle: component.subtitle,
            description: component.description,
          },
        },
      })
      logger.info(`${handle}: pavadinimas ir aprašymas atnaujinti.`)
    }

    if (specData) {
      const input = toComponentSpecInput(specData)
      if (product.component_spec?.id) {
        await updateComponentSpecWorkflow(container).run({
          input: { id: product.component_spec.id, ...input },
        })
        logger.info(`${handle}: specifikacija atnaujinta.`)
      } else {
        await createComponentSpecWorkflow(container).run({ input: { product_id: product.id, ...input } })
        logger.info(`${handle}: specifikacija sukurta.`)
      }
    }

    if (!component && !specData) {
      logger.warn(`${handle}: kode nėra nei prekės, nei specifikacijos aprašo.`)
    }
  }
}
