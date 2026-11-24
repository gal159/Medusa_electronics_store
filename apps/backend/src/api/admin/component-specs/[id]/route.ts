import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  deleteComponentSpecWorkflow,
  updateComponentSpecWorkflow,
} from "../../../../workflows/component-spec"
import { SPEC_FIELDS } from "../route"
import type { UpdateComponentSpecBody } from "../validators"

async function findSpecOrThrow(req: AuthenticatedMedusaRequest, id: string) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "component_spec",
    fields: SPEC_FIELDS,
    filters: { id },
  })

  if (!data[0]) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Specifikacija ${id} nerasta`)
  }
  return data[0]
}

/** GET /admin/component-specs/:id */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const component_spec = await findSpecOrThrow(req, req.params.id)
  res.json({ component_spec })
}

/** POST /admin/component-specs/:id: atnaujina laukus; perduoti sąrašai pakeičiami visi. */
export async function POST(
  req: AuthenticatedMedusaRequest<UpdateComponentSpecBody>,
  res: MedusaResponse
) {
  await findSpecOrThrow(req, req.params.id)

  await updateComponentSpecWorkflow(req.scope).run({
    input: { id: req.params.id, ...req.validatedBody },
  })

  const component_spec = await findSpecOrThrow(req, req.params.id)
  res.json({ component_spec })
}

/** DELETE /admin/component-specs/:id: nutraukia link'ą su produktu ir ištrina (soft) specifikaciją. */
export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const spec = await findSpecOrThrow(req, req.params.id)

  await deleteComponentSpecWorkflow(req.scope).run({
    input: { id: spec.id, product_id: spec.product?.id ?? "" },
  })

  res.json({ id: spec.id, object: "component_spec", deleted: true })
}
