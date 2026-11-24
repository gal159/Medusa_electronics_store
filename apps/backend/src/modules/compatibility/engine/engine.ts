import { ALL_RULES } from "./rules"
import type {
  CompatibilityRule,
  KitSnapshot,
  RuleResult,
  Severity,
  ValidationReport,
} from "./types"

const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 }

/**
 * Įvertina rinkinį visomis (arba nurodytomis) taisyklėmis.
 * Gryna funkcija: tas pats snapshot'as visada duoda tą patį rezultatą.
 * Rezultatai rikiuojami pagal sunkumą, o tada pagal taisyklės ID, kad UI
 * pirmiausia rodytų klaidas.
 */
export function evaluateKit(
  kit: KitSnapshot,
  rules: readonly CompatibilityRule[] = ALL_RULES
): ValidationReport {
  const results: RuleResult[] = rules
    .flatMap((rule) => rule.evaluate(kit))
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        a.ruleId.localeCompare(b.ruleId, undefined, { numeric: true })
    )

  const summary = {
    errors: results.filter((result) => result.severity === "error").length,
    warnings: results.filter((result) => result.severity === "warning").length,
    infos: results.filter((result) => result.severity === "info").length,
  }

  return {
    results,
    summary,
    isOrderable: summary.errors === 0,
    evaluatedRuleIds: rules.map((rule) => rule.id),
  }
}
