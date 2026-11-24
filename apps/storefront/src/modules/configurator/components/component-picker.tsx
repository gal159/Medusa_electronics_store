"use client"

import { useMemo, useState } from "react"

import { convertToLocale } from "@lib/util/money"
import Thumbnail from "@modules/products/components/thumbnail"

import type { Selection } from "../templates"
import type { ConfiguratorCategory, ConfiguratorProduct } from "../types"
import QuantityStepper from "./quantity-stepper"

type Props = {
  products: ConfiguratorProduct[]
  categories: ConfiguratorCategory[]
  selection: Selection
  onChangeQuantity: (variantId: string, quantity: number) => void
}

export default function ComponentPicker({ products, categories, selection, onChangeQuantity }: Props) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    categories.find((category) => category.specCategory === "mcu_board")?.id ?? categories[0]?.id ?? null
  )

  const countByCategory = useMemo(() => {
    const counts = new Map<string, number>()
    for (const product of products) {
      const quantity = selection[product.variantId] ?? 0
      if (!quantity) {
        continue
      }
      for (const categoryId of product.categoryIds) {
        counts.set(categoryId, (counts.get(categoryId) ?? 0) + quantity)
      }
    }
    return counts
  }, [products, selection])

  const visibleProducts = products.filter(
    (product) => !activeCategoryId || product.categoryIds.includes(activeCategoryId)
  )
  const activeCategory = categories.find((category) => category.id === activeCategoryId)

  return (
    <section className="flex flex-col gap-6">
      <nav aria-label="Kategorijos" className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const isActive = category.id === activeCategoryId
          const count = countByCategory.get(category.id) ?? 0
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategoryId(category.id)}
              className={`rounded-full border px-4 py-1.5 text-small-regular transition-colors ${
                isActive
                  ? "border-ui-fg-base bg-ui-fg-base text-ui-fg-on-color"
                  : "border-ui-border-base text-ui-fg-subtle hover:border-ui-fg-base hover:text-ui-fg-base"
              }`}
              data-testid={`category-${category.handle}`}
            >
              {category.name}
              {count > 0 && (
                <span className="ml-2 rounded-full bg-ui-bg-base px-2 text-xsmall-regular text-ui-fg-base">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {activeCategory?.description && (
        <p className="text-small-regular text-ui-fg-subtle">{activeCategory.description}</p>
      )}

      <ul className="grid grid-cols-1 small:grid-cols-2 medium:grid-cols-3 gap-4" data-testid="component-list">
        {groupByProduct(visibleProducts).map((variants) => (
          <ComponentCard
            // Raktas su rinkinyje esančiais variantais: pakeitus variantą iš šablono
            // ar patikros pasiūlymo, kortelė persikrauna ir rodo naują variantą.
            key={`${variants[0].id}:${variants
              .filter((variant) => (selection[variant.variantId] ?? 0) > 0)
              .map((variant) => variant.variantId)
              .join(",")}`}
            variants={variants}
            selection={selection}
            onChangeQuantity={onChangeQuantity}
          />
        ))}
      </ul>
    </section>
  )
}

/** Sugrupuoja variantų įrašus į prekes, išlaikant pradinę tvarką. */
function groupByProduct(entries: ConfiguratorProduct[]): ConfiguratorProduct[][] {
  const groups = new Map<string, ConfiguratorProduct[]>()
  for (const entry of entries) {
    const group = groups.get(entry.id) ?? []
    group.push(entry)
    groups.set(entry.id, group)
  }
  return Array.from(groups.values())
}

/**
 * Prekės kortelė. Kelių variantų prekėje (pvz., maitinimo šaltinis 2–10 A)
 * rodomas variantų pasirinkimas; kiekis ir „Pridėti“ taikomi pasirinktam variantui.
 * Rinkinyje vienu metu gali būti keli tos pačios prekės variantai.
 */
function ComponentCard({
  variants,
  selection,
  onChangeQuantity,
}: {
  variants: ConfiguratorProduct[]
  selection: Selection
  onChangeQuantity: (variantId: string, quantity: number) => void
}) {
  const [chosenVariantId, setChosenVariantId] = useState(
    () => variants.find((variant) => (selection[variant.variantId] ?? 0) > 0)?.variantId ?? variants[0].variantId
  )
  const product = variants.find((variant) => variant.variantId === chosenVariantId) ?? variants[0]
  const quantity = selection[product.variantId] ?? 0
  const anySelected = variants.some((variant) => (selection[variant.variantId] ?? 0) > 0)

  return (
    <li
      className={`flex flex-col gap-3 rounded-lg border p-4 ${
        anySelected ? "border-ui-fg-base" : "border-ui-border-base"
      }`}
      data-testid={`component-${product.handle}`}
    >
      <Thumbnail thumbnail={product.thumbnail} size="square" />
      <div className="flex-1">
        <h3 className="text-base-semi text-ui-fg-base leading-tight">{product.title}</h3>
        {product.subtitle && (
          <p className="text-xsmall-regular text-ui-fg-subtle mt-1">{product.subtitle}</p>
        )}
      </div>
      {variants.length > 1 && (
        <label className="flex flex-col gap-1">
          <span className="text-xsmall-regular text-ui-fg-subtle">Variantas</span>
          <select
            value={chosenVariantId}
            onChange={(event) => setChosenVariantId(event.target.value)}
            className="rounded-md border border-ui-border-base bg-ui-bg-field px-2 py-1.5 text-small-regular"
            data-testid="variant-select"
          >
            {variants.map((variant) => {
              const inKit = selection[variant.variantId] ?? 0
              return (
                <option key={variant.variantId} value={variant.variantId}>
                  {variant.variantTitle}
                  {inKit > 0 ? ` (rinkinyje: ${inKit})` : ""}
                </option>
              )
            })}
          </select>
        </label>
      )}
      <div className="flex items-center justify-between">
        <span className="text-base-semi">
          {product.priceAmount !== null
            ? convertToLocale({ amount: product.priceAmount, currency_code: product.currencyCode })
            : "–"}
        </span>
        {quantity > 0 ? (
          <QuantityStepper
            quantity={quantity}
            onChange={(next) => onChangeQuantity(product.variantId, next)}
          />
        ) : (
          <button
            type="button"
            onClick={() => onChangeQuantity(product.variantId, 1)}
            className="rounded-md bg-ui-button-inverted px-3 py-1.5 text-small-regular text-ui-fg-on-inverted hover:bg-ui-button-inverted-hover"
            data-testid="add-component"
          >
            Pridėti
          </button>
        )}
      </div>
    </li>
  )
}
