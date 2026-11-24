import { Metadata } from "next"

import { getStorePolicies } from "@lib/data/store-policies"
import { PoliciesUnavailable, PolicyPage } from "@modules/policies/templates"

export const dynamic = "force-static"
export const revalidate = 60

export const metadata: Metadata = {
  title: "Grąžinimo sąlygos",
  description: "Kaip grąžinti prekes ir atgauti pinigus.",
}

export default async function ReturnsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const { current } = await getStorePolicies(countryCode)

  return (
    <PolicyPage title="Grąžinimo sąlygos">
      {current ? (
        <>
          <p>
            Prekes galite grąžinti per {current.returnWindowDays} dienų nuo pristatymo. Prekės grąžinamos paštu.
          </p>
          <p>
            {current.freeReturns
              ? "Grąžinimo siuntimas nemokamas."
              : "Grąžinimo siuntimo išlaidas apmoka pirkėjas."}
          </p>
        </>
      ) : (
        <PoliciesUnavailable />
      )}
    </PolicyPage>
  )
}
