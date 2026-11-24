import { Metadata } from "next"
import { notFound } from "next/navigation"

import { listConfiguratorData, listKitPresets } from "@lib/data/configurator"
import { getRegion } from "@lib/data/regions"
import ConfiguratorTemplate from "@modules/configurator/templates"

export const metadata: Metadata = {
  title: "Rinkinio konfigūratorius",
  description:
    "Sudarykite mikrovaldiklio projekto rinkinį ir patikrinkite komponentų suderinamumą pagal gamintojų technines specifikacijas.",
}

export default async function ConfiguratorPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  const [{ products, categories }, presets] = await Promise.all([
    listConfiguratorData(countryCode),
    listKitPresets(),
  ])

  return (
    <ConfiguratorTemplate
      products={products}
      categories={categories}
      presets={presets}
      countryCode={countryCode}
    />
  )
}
