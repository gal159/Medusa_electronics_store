import { convertToLocale } from "@lib/util/money"
import { formatDayRange, StorePolicies } from "@lib/util/store-policies"

export const formatShippingRate = (rate: number, currencyCode: string) =>
  rate === 0 ? "Nemokamai" : convertToLocale({ amount: rate, currency_code: currencyCode })

export const PolicyPage = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <div className="content-container py-12 max-w-3xl" data-testid="policy-page">
    <h1 className="text-2xl-semi mb-8">{title}</h1>
    <div className="flex flex-col gap-6 text-base-regular text-ui-fg-base">
      {children}
    </div>
  </div>
)

export const PoliciesUnavailable = () => (
  <p className="text-ui-fg-subtle">
    Šio regiono sąlygos dar nepaskelbtos.
  </p>
)

export const ShippingSummary = ({
  policies,
  currencyCode,
}: {
  policies: StorePolicies
  currencyCode: string
}) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
    <dt className="text-ui-fg-subtle">Pristatymo kaina</dt>
    <dd>{formatShippingRate(policies.shippingRate, currencyCode)}</dd>
    <dt className="text-ui-fg-subtle">Paruošimo laikas</dt>
    <dd>{formatDayRange(policies.handlingDays)} darbo d.</dd>
    <dt className="text-ui-fg-subtle">Pristatymo laikas</dt>
    <dd>{formatDayRange(policies.transitDays)} darbo d. po išsiuntimo</dd>
  </dl>
)

export const PlaceholderNotice = () => (
  <p className="text-ui-fg-subtle" data-testid="policy-placeholder">
    Tai bakalauro baigiamojo darbo demonstracinė parduotuvė: sąlygos pateiktos informaciniais tikslais ir nėra teisiškai įpareigojančios.
  </p>
)
