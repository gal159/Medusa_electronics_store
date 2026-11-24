"use client"

import { convertToLocale } from "@lib/util/money"

import { displayTitle, type ConfiguratorProduct, type KitItemInput } from "../types"
import QuantityStepper from "./quantity-stepper"

type Props = {
  items: KitItemInput[]
  productByVariant: Map<string, ConfiguratorProduct>
  totalAmount: number
  currencyCode: string
  kitName: string
  onKitNameChange: (name: string) => void
  onChangeQuantity: (variantId: string, quantity: number) => void
  onSave: () => void
  isSaving: boolean
  saveError: string | null
  isOrderable: boolean
  hasValidation: boolean
}

export default function KitSummary({
  items,
  productByVariant,
  totalAmount,
  currencyCode,
  kitName,
  onKitNameChange,
  onChangeQuantity,
  onSave,
  isSaving,
  saveError,
  isOrderable,
  hasValidation,
}: Props) {
  const canSave = items.length > 0 && hasValidation && isOrderable && !isSaving

  return (
    <section className="rounded-lg border border-ui-border-base p-5 flex flex-col gap-4" data-testid="kit-summary">
      <label className="flex flex-col gap-1">
        <span className="text-xsmall-regular text-ui-fg-subtle">Rinkinio pavadinimas</span>
        <input
          value={kitName}
          onChange={(event) => onKitNameChange(event.target.value)}
          maxLength={120}
          className="rounded-md border border-ui-border-base px-3 py-2 text-base-regular"
          data-testid="kit-name"
        />
      </label>

      {items.length === 0 ? (
        <p className="text-small-regular text-ui-fg-subtle">
          Rinkinys tuščias. Pradėkite nuo mikrovaldiklio plokštės.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-ui-border-base">
          {items.map((item) => {
            const product = productByVariant.get(item.variant_id)
            if (!product) {
              return null
            }
            return (
              <li key={item.variant_id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-small-regular text-ui-fg-base truncate">{displayTitle(product)}</p>
                  <p className="text-xsmall-regular text-ui-fg-subtle">
                    {product.priceAmount !== null
                      ? convertToLocale({
                          amount: product.priceAmount * item.quantity,
                          currency_code: product.currencyCode,
                        })
                      : "–"}
                  </p>
                </div>
                <QuantityStepper
                  quantity={item.quantity}
                  onChange={(next) => onChangeQuantity(item.variant_id, next)}
                />
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex items-center justify-between border-t border-ui-border-base pt-3">
        <span className="text-base-regular text-ui-fg-subtle">Iš viso</span>
        <span className="text-large-semi" data-testid="kit-total">
          {convertToLocale({ amount: totalAmount, currency_code: currencyCode })}
        </span>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={!canSave}
        className="w-full rounded-md bg-ui-button-inverted px-4 py-3 text-base-semi text-ui-fg-on-inverted hover:bg-ui-button-inverted-hover disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="save-kit"
      >
        {isSaving ? "Dedama į krepšelį…" : "Išsaugoti rinkinį ir įdėti į krepšelį"}
      </button>

      {items.length > 0 && hasValidation && !isOrderable && (
        <p className="text-xsmall-regular text-ui-fg-error">
          Rinkinyje yra suderinamumo klaidų. Ištaisykite jas, kad galėtumėte užsisakyti.
        </p>
      )}
      {saveError && <p className="text-xsmall-regular text-ui-fg-error">{saveError}</p>}
    </section>
  )
}
