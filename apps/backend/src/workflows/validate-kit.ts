import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { evaluateKit } from "../modules/compatibility/engine"
import type { ValidationReport } from "../modules/compatibility/engine"
import {
  buildKitSnapshot,
  type KitItemInput,
  type ResolvedKitItem,
} from "../modules/compatibility/snapshot"

export type ValidateKitWorkflowInput = {
  items: KitItemInput[]
}

export type ValidateKitWorkflowOutput = {
  report: ValidationReport
  items: ResolvedKitItem[]
  unknown_variant_ids: string[]
  /** Variantai be techninės specifikacijos: patikra jų neįvertino. */
  unspecified_variant_ids: string[]
}

/** Skaito DB (variantai -> specifikacijos) ir sudaro normalizuotą snapshot'ą. */
export const buildKitSnapshotStep = createStep(
  "build-kit-snapshot",
  async (input: ValidateKitWorkflowInput, { container }) => {
    const result = await buildKitSnapshot(container, input.items)
    return new StepResponse(result)
  }
)

/** Gryna patikra: jokių DB skaitymų, tik variklis. Atskiras žingsnis dėl stebimumo. */
export const evaluateKitStep = createStep(
  "evaluate-kit",
  async (input: Awaited<ReturnType<typeof buildKitSnapshot>>) => {
    const report = evaluateKit(input.snapshot)
    const output: ValidateKitWorkflowOutput = {
      report,
      items: input.items,
      unknown_variant_ids: input.unknown_variant_ids,
      unspecified_variant_ids: input.items
        .filter((item) => !item.has_spec)
        .map((item) => item.variant_id),
    }
    return new StepResponse(output)
  }
)

/**
 * Rinkinio patikra: naudojama `POST /store/kits/validate`, rinkinio
 * išsaugojimui ir (4 etape) užsakymo blokavimui complete-cart hook'e.
 */
export const validateKitWorkflow = createWorkflow("validate-kit", (input: ValidateKitWorkflowInput) => {
  const snapshot = buildKitSnapshotStep(input)
  const result = evaluateKitStep(snapshot)
  return new WorkflowResponse(result)
})
