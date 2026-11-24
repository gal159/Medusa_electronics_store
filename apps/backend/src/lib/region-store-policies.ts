/**
 * Parduotuvės politikos, saugomos regiono `metadata`. Storefront iš jų
 * generuoja pristatymo ir grąžinimo puslapius bei struktūrinius duomenis;
 * administratorius gali keisti Settings -> Regions -> Metadata.
 */
export type RegionStorePolicies = {
  return_window_days: number
  free_returns: boolean
  shipping_rate: number
  handling_days_min: number
  handling_days_max: number
  transit_days_min: number
  transit_days_max: number
}

export const DEFAULT_REGION_STORE_POLICIES: RegionStorePolicies = {
  // 14 d. atitinka LR vartotojų teisę atsisakyti nuotolinės sutarties.
  return_window_days: 14,
  free_returns: false,
  // EUR, naudojama ir kaip standartinio pristatymo kaina seed'e.
  shipping_rate: 3.49,
  handling_days_min: 0,
  handling_days_max: 1,
  transit_days_min: 1,
  transit_days_max: 3,
}
