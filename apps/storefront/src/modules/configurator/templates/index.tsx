"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"

import { saveKitAndAddToCart, validateKit } from "@lib/data/kits"
import { notifyCartUpdated } from "@lib/util/cart-events"

import ComponentPicker from "../components/component-picker"
import KitSummary from "../components/kit-summary"
import PresetPanel from "../components/preset-panel"
import ValidationPanel from "../components/validation-panel"
import type {
  ConfiguratorCategory,
  ConfiguratorProduct,
  KitPreset,
  ValidateKitResponse,
} from "../types"

type Props = {
  products: ConfiguratorProduct[]
  categories: ConfiguratorCategory[]
  presets: KitPreset[]
  countryCode: string
}

/** Kiek laukti po paskutinio pakeitimo prieš siunčiant patikrą (ms). */
const VALIDATE_DEBOUNCE_MS = 350

export type Selection = Record<string, number>

/**
 * Konfigūratorius: kairėje komponentai pagal kategorijas, dešinėje rinkinys ir
 * gyva patikra. Patikra vykdoma backend'e (POST /store/kits/validate) po
 * kiekvieno pakeitimo su debounce, kad vienu metu būtų tik viena užklausa.
 */
export default function ConfiguratorTemplate({ products, categories, presets, countryCode }: Props) {
  const router = useRouter()
  const [selection, setSelection] = useState<Selection>({})
  const [validation, setValidation] = useState<ValidateKitResponse | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [kitName, setKitName] = useState("Mano rinkinys")
  const [isSaving, startSaving] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)
  const requestCounter = useRef(0)

  const productByVariant = useMemo(
    () => new Map(products.map((product) => [product.variantId, product])),
    [products]
  )
  // Pagal handle – pirmasis (pigiausias) prekės variantas; Map išlaiko pirmą reikšmę, nes sąrašas apverstas
  const productByHandle = useMemo(
    () => new Map([...products].reverse().map((product) => [product.handle, product])),
    [products]
  )

  const items = useMemo(
    () =>
      Object.entries(selection)
        .filter(([, quantity]) => quantity > 0)
        .map(([variant_id, quantity]) => ({ variant_id, quantity })),
    [selection]
  )

  useEffect(() => {
    if (!items.length) {
      // Tuščiam rinkiniui patikros nėra; rodymas valdomas žemiau per `activeValidation`.
      requestCounter.current++
      return
    }

    const requestId = ++requestCounter.current
    const timer = setTimeout(() => {
      setIsValidating(true)
      validateKit(items)
        .then((result) => {
          // Atmetame pasenusius atsakymus, jei naudotojas spėjo pakeisti rinkinį
          if (requestId === requestCounter.current) {
            setValidation(result)
            setValidationError(null)
          }
        })
        .catch((error: Error) => {
          if (requestId === requestCounter.current) {
            setValidationError(error.message)
          }
        })
        .finally(() => {
          if (requestId === requestCounter.current) {
            setIsValidating(false)
          }
        })
    }, VALIDATE_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [items])

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setSelection((current) => {
      const next = { ...current }
      if (quantity <= 0) {
        delete next[variantId]
      } else {
        next[variantId] = Math.min(quantity, 100)
      }
      return next
    })
  }, [])

  const addByHandle = useCallback(
    (handle: string) => {
      const product = productByHandle.get(handle)
      if (product) {
        setQuantity(product.variantId, (selection[product.variantId] ?? 0) + 1)
      }
    },
    [productByHandle, selection, setQuantity]
  )

  /**
   * Šablono taikymas: rinkinys pakeičiamas pozicijų numatytaisiais. Varianto
   * pavadinimas (pvz., „6 A“) išsprendžiamas pagal katalogą; jei jo nėra,
   * imamas pirmasis prekės variantas.
   */
  const applyPreset = useCallback(
    (preset: KitPreset) => {
      const next: Selection = {}
      for (const slot of preset.slots) {
        if (!slot.default) {
          continue
        }
        const { handle, variantTitle, quantity } = slot.default
        const variants = products.filter((product) => product.handle === handle)
        const variant =
          variants.find((candidate) => variantTitle && candidate.variantTitle === variantTitle) ??
          variants[0]
        if (variant) {
          next[variant.variantId] = quantity ?? 1
        }
      }
      setSelection(next)
    },
    [products]
  )

  /** Šablono pozicijos prekės keitimas: išimami visi pozicijos variantai, įdedamas naujas. */
  const setSlotItem = useCallback(
    (removeVariantIds: string[], variantId: string | null, quantity: number) => {
      setSelection((current) => {
        const next = { ...current }
        for (const id of removeVariantIds) {
          delete next[id]
        }
        if (variantId) {
          next[variantId] = quantity
        }
        return next
      })
    },
    []
  )

  /** Varianto pakeitimas (pvz., 6 A → 10 A) išlaikant kiekį. */
  const replaceVariant = useCallback((oldVariantId: string, newVariantId: string) => {
    setSelection((current) => {
      if (oldVariantId === newVariantId) {
        return current
      }
      const next = { ...current }
      const quantity = next[oldVariantId] ?? 1
      delete next[oldVariantId]
      next[newVariantId] = (next[newVariantId] ?? 0) + quantity
      return next
    })
  }, [])

  const handleSave = () => {
    if (!items.length) {
      return
    }
    setSaveError(null)
    startSaving(async () => {
      try {
        await saveKitAndAddToCart({ name: kitName.trim() || "Mano rinkinys", items, countryCode })
        notifyCartUpdated()
        router.push(`/${countryCode}/cart`)
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Nepavyko įdėti rinkinio į krepšelį")
      }
    })
  }

  // Tuščiam rinkiniui senas rezultatas nerodomas, bet būsena neperrašinėjama efekte.
  const activeValidation = items.length ? validation : null
  const activeValidationError = items.length ? validationError : null

  const totalAmount = items.reduce((sum, item) => {
    const product = productByVariant.get(item.variant_id)
    return sum + (product?.priceAmount ?? 0) * item.quantity
  }, 0)
  const currencyCode = products[0]?.currencyCode ?? "eur"

  return (
    <div className="content-container py-8" data-testid="configurator">
      <div className="mb-8">
        <h1 className="text-2xl-semi text-ui-fg-base">Rinkinio konfigūratorius</h1>
        <p className="text-base-regular text-ui-fg-subtle mt-2 max-w-3xl">
          Pasirinkite mikrovaldiklio plokštę ir komponentus. Suderinamumas tikrinamas iš karto
          pagal gamintojų techninius duomenis: maitinimo įtampą, loginius lygius, srovės biudžetą,
          I2C adresus ir kontaktų skaičių. Rinkinio su klaidomis užsisakyti negalima, kol jos
          neištaisytos.
        </p>
      </div>

      <div className="grid grid-cols-1 small:grid-cols-[minmax(0,1fr)_400px] gap-8">
        <div className="flex flex-col gap-6 min-w-0">
          <PresetPanel
            presets={presets}
            products={products}
            selection={selection}
            validation={activeValidation}
            onApplyPreset={applyPreset}
            onSetSlotItem={setSlotItem}
            onChangeQuantity={setQuantity}
            onReplaceVariant={replaceVariant}
          />
          <ComponentPicker
            products={products}
            categories={categories}
            selection={selection}
            onChangeQuantity={setQuantity}
          />
        </div>

        <aside className="flex flex-col gap-6 small:sticky small:top-20 self-start">
          <KitSummary
            items={items}
            productByVariant={productByVariant}
            totalAmount={totalAmount}
            currencyCode={currencyCode}
            kitName={kitName}
            onKitNameChange={setKitName}
            onChangeQuantity={setQuantity}
            onSave={handleSave}
            isSaving={isSaving}
            saveError={saveError}
            isOrderable={activeValidation?.report.isOrderable ?? false}
            hasValidation={Boolean(activeValidation)}
          />
          <ValidationPanel
            validation={activeValidation}
            isValidating={isValidating && items.length > 0}
            error={activeValidationError}
            hasItems={items.length > 0}
            productByVariant={productByVariant}
            productByHandle={productByHandle}
            onAddByHandle={addByHandle}
            onReplaceVariant={replaceVariant}
          />
        </aside>
      </div>
    </div>
  )
}
