import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createComponentSpecWorkflow } from "../../../workflows/component-spec"
import type { CreateComponentSpecBody, ListComponentSpecsQuery } from "./validators"

export const SPEC_FIELDS = [
  "id",
  "category",
  "supply_voltage_min_v",
  "supply_voltage_max_v",
  "logic_voltage_v",
  "input_high_min_v",
  "is_five_volt_tolerant",
  "current_typ_ma",
  "current_max_ma",
  "datasheet_url",
  "datasheet_note",
  "notes",
  "attributes",
  "created_at",
  "updated_at",
  "interfaces.*",
  "power_rails.*",
  "mcu.*",
  "product.id",
  "product.title",
  "product.handle",
]

/** GET /admin/component-specs?product_id=&category=&limit=&offset= */
export async function GET(
  req: AuthenticatedMedusaRequest<unknown, ListComponentSpecsQuery>,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { product_id, category, limit, offset } = req.validatedQuery

  if (product_id) {
    // Per link'ą: produktas -> specifikacija
    const { data: products } = await query.graph({
      entity: "product",
      fields: SPEC_FIELDS.filter((field) => !field.startsWith("product.")).map(
        (field) => `component_spec.${field}`
      ),
      filters: { id: product_id },
    })

    // Link'o laukas (component_spec) į sugeneruotus Query tipus patenka tik po build.
    const spec =
      (products[0] as { component_spec?: Record<string, unknown> | null } | undefined)
        ?.component_spec ?? null
    res.json({
      component_specs: spec ? [{ ...spec, product: { id: product_id } }] : [],
      count: spec ? 1 : 0,
      limit,
      offset,
    })
    return
  }

  const { data: component_specs, metadata } = await query.graph({
    entity: "component_spec",
    fields: SPEC_FIELDS,
    filters: category ? { category } : undefined,
    pagination: { take: limit, skip: offset, order: { created_at: "DESC" } },
  })

  res.json({
    component_specs,
    count: metadata?.count ?? component_specs.length,
    limit,
    offset,
  })
}

/** POST /admin/component-specs: sukuria specifikaciją ir susieja su produktu. */
export async function POST(
  req: AuthenticatedMedusaRequest<CreateComponentSpecBody>,
  res: MedusaResponse
) {
  const { result } = await createComponentSpecWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "component_spec",
    fields: SPEC_FIELDS,
    filters: { id: result.id },
  })

  res.status(201).json({ component_spec: data[0] })
}
