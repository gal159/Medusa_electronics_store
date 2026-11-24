"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

import {
  displayTitle,
  type ConfiguratorProduct,
  type RuleResult,
  type Severity,
  type ValidateKitResponse,
} from "../types"

type Props = {
  validation: ValidateKitResponse | null
  isValidating: boolean
  error: string | null
  hasItems: boolean
  productByVariant: Map<string, ConfiguratorProduct>
  productByHandle: Map<string, ConfiguratorProduct>
  onAddByHandle: (handle: string) => void
  onReplaceVariant: (oldVariantId: string, newVariantId: string) => void
}

const SEVERITY_STYLES: Record<
  Severity,
  { label: string; container: string; badge: string }
> = {
  error: {
    label: "Klaida",
    container: "border-ui-tag-red-border bg-ui-tag-red-bg",
    badge: "bg-ui-tag-red-icon text-white",
  },
  warning: {
    label: "Įspėjimas",
    container: "border-ui-tag-orange-border bg-ui-tag-orange-bg",
    badge: "bg-ui-tag-orange-icon text-white",
  },
  info: {
    label: "Informacija",
    container: "border-ui-tag-blue-border bg-ui-tag-blue-bg",
    badge: "bg-ui-tag-blue-icon text-white",
  },
}

export default function ValidationPanel({
  validation,
  isValidating,
  error,
  hasItems,
  productByVariant,
  productByHandle,
  onAddByHandle,
  onReplaceVariant,
}: Props) {
  return (
    <section
      className="rounded-lg border border-ui-border-base p-5 flex flex-col gap-4"
      data-testid="validation-panel"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-large-semi">Suderinamumo patikra</h2>
        {isValidating && (
          <span className="text-xsmall-regular text-ui-fg-subtle">
            Tikrinama…
          </span>
        )}
      </div>

      {!hasItems && (
        <p className="text-small-regular text-ui-fg-subtle">
          Pridėkite komponentų, ir rezultatai atsiras čia.
        </p>
      )}

      {error && (
        <p className="text-small-regular text-ui-fg-error">
          Patikros klaida: {error}
        </p>
      )}

      {validation && (
        <>
          <Summary validation={validation} />

          {validation.unspecified_variant_ids.length > 0 && (
            <p className="text-xsmall-regular text-ui-fg-subtle">
              Be techninės specifikacijos (neįvertinta):{" "}
              {validation.unspecified_variant_ids
                .map((variantId) => {
                  const product = productByVariant.get(variantId)
                  return product ? displayTitle(product) : variantId
                })
                .join(", ")}
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {validation.report.results.map((result, index) => (
              <ResultCard
                key={`${result.ruleId}-${index}`}
                result={result}
                productByVariant={productByVariant}
                productByHandle={productByHandle}
                onAddByHandle={onAddByHandle}
                onReplaceVariant={onReplaceVariant}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function Summary({ validation }: { validation: ValidateKitResponse }) {
  const { summary, isOrderable } = validation.report
  return (
    <div
      className={`rounded-md px-3 py-2 text-small-regular ${
        isOrderable
          ? "bg-ui-tag-green-bg text-ui-tag-green-text"
          : "bg-ui-tag-red-bg text-ui-tag-red-text"
      }`}
      data-testid="validation-summary"
    >
      {isOrderable ? "Rinkinys suderinamas." : "Rinkinys turi klaidų."} Klaidų:{" "}
      {summary.errors}, įspėjimų: {summary.warnings}, pastabų: {summary.infos}.
    </div>
  )
}

function ResultCard({
  result,
  productByVariant,
  productByHandle,
  onAddByHandle,
  onReplaceVariant,
}: {
  result: RuleResult
  productByVariant: Map<string, ConfiguratorProduct>
  productByHandle: Map<string, ConfiguratorProduct>
  onAddByHandle: (handle: string) => void
  onReplaceVariant: (oldVariantId: string, newVariantId: string) => void
}) {
  const style = SEVERITY_STYLES[result.severity]
  const suggestedProduct = result.suggestion?.productHandle
    ? productByHandle.get(result.suggestion.productHandle)
    : undefined
  // Pasiūlymas pakeisti rinkinio eilutę: kitu tos pačios prekės variantu (6 A → 10 A)
  // arba kita preke (pvz., vienos spalvos juostai Uno → dimeris)
  const replacement = result.suggestion?.replaceItemId
    ? {
        from: result.suggestion.replaceItemId,
        to: result.suggestion.replaceWithVariantId
          ? productByVariant.get(result.suggestion.replaceWithVariantId)
          : suggestedProduct,
      }
    : null
  const involved = result.involvedItemIds
    .map((variantId) => {
      const product = productByVariant.get(variantId)
      return product ? displayTitle(product) : undefined
    })
    .filter((title): title is string => Boolean(title))

  return (
    <li
      className={`rounded-md border p-3 flex flex-col gap-2 ${style.container}`}
      data-testid={`result-${result.ruleId}`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-xsmall-regular ${style.badge}`}
        >
          {result.ruleId} · {style.label}
        </span>
        <p className="text-small-semi text-ui-fg-base">{result.message}</p>
      </div>
      <p className="text-xsmall-regular text-ui-fg-subtle">
        {result.explanation}
      </p>
      {involved.length > 0 && (
        <p className="text-xsmall-regular text-ui-fg-muted">
          Susiję: {involved.join(", ")}
        </p>
      )}
      {result.suggestion && (
        <div className="flex items-center justify-between gap-2 rounded bg-white/70 px-2 py-1.5">
          <p className="text-xsmall-regular text-ui-fg-base">
            {result.suggestion.text}
          </p>
          {replacement?.to && (
            <button
              type="button"
              onClick={() => onReplaceVariant(replacement.from, replacement.to!.variantId)}
              className="shrink-0 rounded-md border border-ui-border-base bg-white px-2 py-1 text-xsmall-regular hover:border-ui-fg-base"
              data-testid="apply-replacement"
            >
              Pakeisti
            </button>
          )}
          {!replacement?.to && suggestedProduct && (
            <button
              type="button"
              onClick={() => onAddByHandle(suggestedProduct.handle)}
              className="shrink-0 rounded-md border border-ui-border-base bg-white px-2 py-1 text-xsmall-regular hover:border-ui-fg-base"
              data-testid="apply-suggestion"
            >
              Pridėti
            </button>
          )}
        </div>
      )}
      {result.source && (
        <a
          href={result.source}
          target="_blank"
          rel="noreferrer"
          className="text-xsmall-regular text-ui-fg-interactive hover:underline w-fit"
        >
          Šaltinis (datasheet)
        </a>
      )}
      {result.suggestion?.productHandle && suggestedProduct && (
        <LocalizedClientLink
          href={`/products/${suggestedProduct.handle}`}
          className="text-xsmall-regular text-ui-fg-subtle hover:underline w-fit"
        >
          Apie siūlomą komponentą
        </LocalizedClientLink>
      )}
    </li>
  )
}
