"use client"

import { useMemo, useState } from "react"

import { convertToLocale } from "@lib/util/money"
import Thumbnail from "@modules/products/components/thumbnail"

import type { Selection } from "../templates"
import {
  displayTitle,
  type ConfiguratorProduct,
  type KitPreset,
  type KitPresetSlot,
  type RuleResult,
  type ValidateKitResponse,
} from "../types"
import QuantityStepper from "./quantity-stepper"

type Props = {
  presets: KitPreset[]
  products: ConfiguratorProduct[]
  selection: Selection
  validation: ValidateKitResponse | null
  onApplyPreset: (preset: KitPreset) => void
  /** Pakeičia pozicijos prekę/variantą: pašalina `removeVariantIds`, prideda `variantId` su `quantity`. */
  onSetSlotItem: (removeVariantIds: string[], variantId: string | null, quantity: number) => void
  onChangeQuantity: (variantId: string, quantity: number) => void
  onReplaceVariant: (oldVariantId: string, newVariantId: string) => void
}

type Tone = "ok" | "warning" | "error"

type SlotStatus = {
  tone: Tone
  label: string
  result?: RuleResult
  /** Pasiūlymas pakeisti būtent šios pozicijos variantą (rodomas mygtukas „Pakeisti“). */
  replacement?: { from: string; to: string; text: string }
}

/** Bendri pozicijos duomenys, kuriuos naudoja ir žingsnio kortelė, ir pasirinkimų skydelis. */
type SlotData = {
  /** Leidžiamos prekės (kiekviena – jos variantų sąrašas) šablone nurodyta tvarka. */
  allowedProducts: ConfiguratorProduct[][]
  slotVariantIds: string[]
  inKit: ConfiguratorProduct[]
  status: SlotStatus | null
  /** Vienkartinės pozicijos pasirinkta prekė (daugkartinėje – null). */
  current: ConfiguratorProduct | null
  currentVariants: ConfiguratorProduct[]
  quantity: number
}

type SlotActions = Pick<Props, "onSetSlotItem" | "onChangeQuantity" | "onReplaceVariant">

const BADGE_CLASS: Record<Tone, string> = {
  ok: "bg-ui-tag-green-bg text-ui-tag-green-text",
  warning: "bg-ui-tag-orange-bg text-ui-tag-orange-text",
  error: "bg-ui-tag-red-bg text-ui-tag-red-text",
}

const STEP_CLASS: Record<Tone | "empty", string> = {
  ok: "bg-ui-tag-green-icon text-white",
  warning: "bg-ui-tag-orange-icon text-white",
  error: "bg-ui-tag-red-icon text-white",
  empty: "border border-ui-border-strong bg-ui-bg-base text-ui-fg-subtle",
}

/**
 * Šablono skydelis: pozicijos išdėstytos kaip horizontali žingsnių eilė
 * (1 → 2 → 3 → 4) su didelėmis pasirinktų prekių nuotraukomis. Paspaudus
 * žingsnį, po eile išsiskleidžia pasirinkimų kortelės. Būsena saugoma tame
 * pačiame `selection` kaip ir laisvai pasirinktų komponentų, todėl patikra,
 * suma ir išsaugojimas veikia be papildomų kelių.
 */
export default function PresetPanel({
  presets,
  products,
  selection,
  validation,
  onApplyPreset,
  onSetSlotItem,
  onChangeQuantity,
  onReplaceVariant,
}: Props) {
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  // Vienu metu išskleista viena pozicija
  const [openSlotKey, setOpenSlotKey] = useState<string | null>(null)
  const activePreset = presets.find((preset) => preset.id === activePresetId) ?? null
  const actions: SlotActions = { onSetSlotItem, onChangeQuantity, onReplaceVariant }

  if (!presets.length) {
    return null
  }

  if (!activePreset) {
    return (
      <section className="rounded-lg border border-ui-border-base p-5 flex flex-col gap-3" data-testid="preset-list">
        <h2 className="text-large-semi">Pradėti nuo šablono</h2>
        <ul className="flex flex-col gap-3">
          {presets.map((preset) => (
            <li key={preset.id} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base-semi">{preset.name}</p>
                <p className="text-small-regular text-ui-fg-subtle">{preset.description}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onApplyPreset(preset)
                  setActivePresetId(preset.id)
                  setOpenSlotKey(null)
                }}
                className="shrink-0 rounded-md bg-ui-button-inverted px-3 py-1.5 text-small-regular text-ui-fg-on-inverted hover:bg-ui-button-inverted-hover"
                data-testid={`apply-preset-${preset.id}`}
              >
                Naudoti šabloną
              </button>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  const openSlot = activePreset.slots.find((slot) => slot.key === openSlotKey) ?? null

  return (
    <section className="rounded-lg border border-ui-fg-base p-5 flex flex-col gap-5" data-testid="preset-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-large-semi">{activePreset.name}</h2>
          <p className="text-small-regular text-ui-fg-subtle">{activePreset.description}</p>
        </div>
        <button
          type="button"
          onClick={() => setActivePresetId(null)}
          className="shrink-0 text-small-regular text-ui-fg-subtle hover:text-ui-fg-base"
        >
          Uždaryti šabloną
        </button>
      </div>

      <ol className="grid grid-cols-2 small:grid-cols-4 gap-4">
        {activePreset.slots.map((slot, index) => (
          <PresetStep
            key={slot.key}
            index={index}
            isLast={index === activePreset.slots.length - 1}
            isOpen={openSlotKey === slot.key}
            onToggle={() => setOpenSlotKey((current) => (current === slot.key ? null : slot.key))}
            slot={slot}
            products={products}
            selection={selection}
            validation={validation}
            actions={actions}
          />
        ))}
      </ol>

      {openSlot && (
        <SlotOptions
          key={openSlot.key}
          slot={openSlot}
          products={products}
          selection={selection}
          validation={validation}
          actions={actions}
          onClose={() => setOpenSlotKey(null)}
        />
      )}
    </section>
  )
}

function useSlotData(
  slot: KitPresetSlot,
  products: ConfiguratorProduct[],
  selection: Selection,
  validation: ValidateKitResponse | null
): SlotData {
  const allowedProducts = useMemo(
    () =>
      slot.allowedHandles
        .map((handle) => products.filter((product) => product.handle === handle))
        .filter((variants) => variants.length > 0),
    [slot.allowedHandles, products]
  )
  const slotVariantIds = allowedProducts.flat().map((product) => product.variantId)
  const inKit = allowedProducts.flat().filter((product) => (selection[product.variantId] ?? 0) > 0)
  const current = slot.multiple ? null : inKit[0] ?? null
  // Pasiūlymo prekė pagal handle → jos pirmasis (pigiausias) variantas
  const resolveHandle = (handle: string) => products.find((product) => product.handle === handle)?.variantId
  return {
    allowedProducts,
    slotVariantIds,
    inKit,
    status: slotStatus(inKit, validation, resolveHandle),
    current,
    currentVariants: current
      ? allowedProducts.find((variants) => variants[0].id === current.id) ?? []
      : [],
    quantity: current ? selection[current.variantId] ?? 1 : slot.default?.quantity ?? 1,
  }
}

/** Žingsnio kortelė: numeris, didelė pasirinktos prekės nuotrauka, būsena ir valdikliai. */
function PresetStep({
  index,
  isLast,
  isOpen,
  onToggle,
  slot,
  products,
  selection,
  validation,
  actions,
}: {
  index: number
  isLast: boolean
  isOpen: boolean
  onToggle: () => void
  slot: KitPresetSlot
  products: ConfiguratorProduct[]
  selection: Selection
  validation: ValidateKitResponse | null
  actions: SlotActions
}) {
  const { inKit, status, current, currentVariants, quantity } = useSlotData(slot, products, selection, validation)
  const stepTone = inKit.length && status ? status.tone : "empty"
  const selectedTitle = inKit.length ? inKit.map(displayTitle).join(", ") : "Nepasirinkta"
  const preview = inKit[0] ?? null

  return (
    <li className="relative flex min-w-0 flex-col items-center gap-3" data-testid={`slot-${slot.key}`}>
      {/* Horizontali linija iki kito žingsnio (kai visi žingsniai vienoje eilėje) */}
      {!isLast && (
        <span
          aria-hidden
          className="absolute left-1/2 top-4 hidden h-0.5 w-[calc(100%+1rem)] -translate-y-1/2 rounded-full bg-ui-border-strong small:block"
        />
      )}
      <span
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-small-semi ${STEP_CLASS[stepTone]}`}
        data-testid="slot-step"
      >
        {index + 1}
      </span>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`group flex w-full flex-col gap-2 rounded-lg border p-2 text-left ${
          isOpen ? "border-ui-fg-base ring-1 ring-ui-fg-base" : "border-ui-border-base hover:border-ui-fg-muted"
        }`}
        data-testid="slot-toggle"
      >
        <span className="relative block">
          <Thumbnail thumbnail={preview?.thumbnail} size="square" alt={preview?.title ?? slot.label} />
          {inKit.length > 1 && (
            <span className="absolute bottom-2 right-2 z-10 rounded-full bg-ui-fg-base px-2 py-0.5 text-xsmall-regular text-white">
              +{inKit.length - 1}
            </span>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-small-semi text-ui-fg-base">
            {slot.label}
            {slot.optional ? <span className="font-normal text-ui-fg-muted"> (nebūtina)</span> : null}
          </span>
          {inKit.length > 0 && status && (
            <span
              className={`rounded px-2 py-0.5 text-xsmall-regular ${BADGE_CLASS[status.tone]}`}
              data-testid="slot-status"
            >
              {status.label}
            </span>
          )}
        </span>
        <span className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-xsmall-regular text-ui-fg-subtle" data-testid="slot-selected">
            {selectedTitle}
          </span>
          <Chevron open={isOpen} />
        </span>
      </button>

      {current && currentVariants.length > 1 && (
        <select
          value={current.variantId}
          onChange={(event) => actions.onReplaceVariant(current.variantId, event.target.value)}
          className="w-full rounded-md border border-ui-border-base bg-ui-bg-field px-2 py-1.5 text-small-regular"
          aria-label={`${slot.label}: variantas`}
          data-testid="slot-variant"
        >
          {currentVariants.map((variant) => (
            <option key={variant.variantId} value={variant.variantId}>
              {variant.variantTitle}
              {variant.priceAmount !== null ? ` – ${formatPrice(variant.priceAmount, variant.currencyCode)}` : ""}
            </option>
          ))}
        </select>
      )}
      {current && slot.quantity && (
        <span className="flex items-center gap-2 text-small-regular">
          {slot.quantity.label}:
          <QuantityStepper
            quantity={quantity}
            min={slot.quantity.min}
            onChange={(next) => actions.onChangeQuantity(current.variantId, Math.min(next, slot.quantity!.max))}
          />
        </span>
      )}

      {status?.replacement && (
        <div
          className={`flex w-full flex-col gap-2 rounded px-2 py-2 ${
            status.tone === "error" ? "bg-ui-tag-red-bg" : "bg-ui-tag-orange-bg"
          }`}
        >
          <p className="text-xsmall-regular text-ui-fg-base">{status.replacement.text}</p>
          <button
            type="button"
            onClick={() => actions.onReplaceVariant(status.replacement!.from, status.replacement!.to)}
            className="rounded-md border border-ui-border-base bg-white px-2 py-1 text-xsmall-regular hover:border-ui-fg-base"
            data-testid="slot-apply-upgrade"
          >
            Pakeisti
          </button>
        </div>
      )}
    </li>
  )
}

/** Išskleistos pozicijos pasirinkimai per visą plotį po žingsnių eile. */
function SlotOptions({
  slot,
  products,
  selection,
  validation,
  actions,
  onClose,
}: {
  slot: KitPresetSlot
  products: ConfiguratorProduct[]
  selection: Selection
  validation: ValidateKitResponse | null
  actions: SlotActions
  onClose: () => void
}) {
  const { allowedProducts, slotVariantIds, current, quantity } = useSlotData(slot, products, selection, validation)

  const chooseProduct = (variants: ConfiguratorProduct[] | null) => {
    if (!variants || variants[0].id !== current?.id) {
      actions.onSetSlotItem(slotVariantIds, variants ? variants[0].variantId : null, slot.quantity ? quantity : 1)
    }
    onClose()
  }

  const toggleProduct = (variants: ConfiguratorProduct[]) => {
    const inKitVariant = variants.find((variant) => (selection[variant.variantId] ?? 0) > 0)
    actions.onChangeQuantity(inKitVariant?.variantId ?? variants[0].variantId, inKitVariant ? 0 : 1)
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-ui-bg-subtle p-4" data-testid="slot-options">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-small-semi">
            {slot.label}: {slot.multiple ? "pažymėkite norimus" : "pasirinkite"}
          </p>
          {slot.hint && <p className="text-xsmall-regular text-ui-fg-subtle">{slot.hint}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-small-regular text-ui-fg-subtle hover:text-ui-fg-base"
        >
          Uždaryti
        </button>
      </div>
      <div role="group" aria-label={slot.label} className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-5 gap-3">
        {slot.optional && !slot.multiple && (
          <button
            type="button"
            onClick={() => chooseProduct(null)}
            aria-pressed={!current}
            className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-ui-bg-base p-2 text-xsmall-regular text-ui-fg-subtle ${
              !current ? "border-ui-fg-base" : "border-ui-border-strong hover:border-ui-fg-muted"
            }`}
            data-testid="slot-option-none"
          >
            Nepasirinkta
          </button>
        )}
        {allowedProducts.map((variants) => (
          <OptionCard
            key={variants[0].id}
            variants={variants}
            selected={variants.some((variant) => (selection[variant.variantId] ?? 0) > 0)}
            onClick={() => (slot.multiple ? toggleProduct(variants) : chooseProduct(variants))}
          />
        ))}
      </div>
    </div>
  )
}

/** Pasirinkimo kortelė: nuotrauka, pavadinimas, kaina („nuo …“, kai prekė turi kelis variantus). */
function OptionCard({
  variants,
  selected,
  onClick,
}: {
  variants: ConfiguratorProduct[]
  selected: boolean
  onClick: () => void
}) {
  const product = variants[0]
  const prices = variants
    .map((variant) => variant.priceAmount)
    .filter((amount): amount is number => amount !== null)
  const minPrice = prices.length ? Math.min(...prices) : null

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative flex flex-col gap-2 rounded-lg border bg-ui-bg-base p-2 text-left ${
        selected ? "border-ui-fg-base ring-1 ring-ui-fg-base" : "border-ui-border-base hover:border-ui-fg-muted"
      }`}
      data-testid={`slot-option-${product.handle}`}
    >
      <Thumbnail thumbnail={product.thumbnail} size="square" alt={product.title} />
      {selected && (
        <span
          aria-hidden
          className="absolute right-3 top-3 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-ui-fg-base text-xsmall-regular text-white"
        >
          ✓
        </span>
      )}
      <span className="line-clamp-2 text-xsmall-regular leading-tight text-ui-fg-base">{product.title}</span>
      {minPrice !== null && (
        <span className="text-xsmall-regular text-ui-fg-subtle">
          {variants.length > 1 ? "nuo " : ""}
          {formatPrice(minPrice, product.currencyCode)}
        </span>
      )}
    </button>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={`mt-0.5 h-4 w-4 shrink-0 text-ui-fg-subtle transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function formatPrice(amount: number, currencyCode: string): string {
  return convertToLocale({ amount, currency_code: currencyCode })
}

/**
 * Pozicijos būsena pagal patikros rezultatus, kuriuose dalyvauja jos prekė.
 * Maitinimo šaltinio R4 klaida rodoma kaip „Persilpnas“.
 */
function slotStatus(
  inKit: ConfiguratorProduct[],
  validation: ValidateKitResponse | null,
  resolveHandle: (handle: string) => string | undefined
): SlotStatus | null {
  if (!validation || !inKit.length) {
    return null
  }
  const ids = new Set(inKit.map((product) => product.variantId))
  const related = validation.report.results.filter((result) =>
    result.involvedItemIds.some((id) => ids.has(id))
  )
  // Pakeitimo pasiūlymas priklauso tik tai pozicijai, kurios eilutę jis keičia: kitu variantu
  // (`replaceWithVariantId`) arba kita preke (`productHandle`)
  const replacementFor = (result: RuleResult) => {
    const suggestion = result.suggestion
    if (!suggestion?.replaceItemId || !ids.has(suggestion.replaceItemId)) {
      return undefined
    }
    const to =
      suggestion.replaceWithVariantId ??
      (suggestion.productHandle ? resolveHandle(suggestion.productHandle) : undefined)
    return to ? { from: suggestion.replaceItemId, to, text: suggestion.text } : undefined
  }
  const error = related.find((result) => result.severity === "error")
  if (error) {
    const replacement = replacementFor(error)
    // R4 perkrova, kurioje šios pozicijos prekė yra šaltinis (ją keičia pasiūlymas arba ji
    // įvardyta pranešime „Maitinimo šaltinis „…“ persilpnas“), žymima „Persilpnas“
    const isOverloadedSupply =
      error.ruleId === "R4" &&
      (replacement !== undefined ||
        (error.message.includes("persilpnas") &&
          inKit.some((product) => error.message.includes(product.title))))
    const label = isOverloadedSupply ? "Persilpnas" : `Klaida (${error.ruleId})`
    return { tone: "error", label, result: error, replacement }
  }
  const warning = related.find((result) => result.severity === "warning")
  if (warning) {
    return { tone: "warning", label: `Įspėjimas (${warning.ruleId})`, result: warning, replacement: replacementFor(warning) }
  }
  return { tone: "ok", label: "Tinka" }
}
