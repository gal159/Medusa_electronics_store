import { PRODUCT_INDEX_NAME, priceAttribute } from "@lib/search-client"

export const OPTION_VALUES_ATTRIBUTE = "option_values"
export const CATEGORY_ATTRIBUTE = "category"
// The index calls the product's tags "labels".
export const LABELS_ATTRIBUTE = "labels"

export const getSortOptions = (currencyCode: string) => {
  const minPrice = priceAttribute("min_price", currencyCode)

  return [
    { value: PRODUCT_INDEX_NAME, label: "Pagal atitikimą" },
    {
      value: `${PRODUCT_INDEX_NAME}/sort/created_at:desc`,
      label: "Naujausios",
    },
    {
      value: `${PRODUCT_INDEX_NAME}/sort/${minPrice}:asc`,
      label: "Kaina: nuo mažiausios",
    },
    {
      value: `${PRODUCT_INDEX_NAME}/sort/${minPrice}:desc`,
      label: "Kaina: nuo didžiausios",
    },
    { value: `${PRODUCT_INDEX_NAME}/sort/title:asc`, label: "Pavadinimas: A–Ž" },
    { value: `${PRODUCT_INDEX_NAME}/sort/title:desc`, label: "Pavadinimas: Ž–A" },
  ]
}
