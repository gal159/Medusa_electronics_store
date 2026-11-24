"use client"

type Props = {
  quantity: number
  onChange: (quantity: number) => void
  min?: number
}

export default function QuantityStepper({ quantity, onChange, min = 0 }: Props) {
  return (
    <div className="inline-flex items-center rounded-md border border-ui-border-base">
      <button
        type="button"
        aria-label="Sumažinti kiekį"
        onClick={() => onChange(Math.max(min, quantity - 1))}
        className="px-2.5 py-1 text-ui-fg-subtle hover:text-ui-fg-base"
      >
        −
      </button>
      <span className="min-w-[2ch] text-center text-small-regular" data-testid="quantity">
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Padidinti kiekį"
        onClick={() => onChange(quantity + 1)}
        className="px-2.5 py-1 text-ui-fg-subtle hover:text-ui-fg-base"
      >
        +
      </button>
    </div>
  )
}
