import { Metadata } from "next"

import { STORE_NAME } from "@lib/util/site"
import { PlaceholderNotice, PolicyPage } from "@modules/policies/templates"

export const dynamic = "force-static"
export const revalidate = 60

export const metadata: Metadata = {
  title: "Pirkimo taisyklės",
  description: `Taisyklės, taikomos perkant iš ${STORE_NAME}.`,
}

export default function TermsPage() {
  return (
    <PolicyPage title="Pirkimo taisyklės">
      <PlaceholderNotice />
      <p>
        Pateikdami užsakymą {STORE_NAME} sutinkate su šiomis taisyklėmis. Kainos, prekių likučiai ir pristatymo būdai rodomi prekių puslapiuose ir apmokant; jie gali keistis be išankstinio įspėjimo.
      </p>
      <p>
        Užsakymas patvirtinamas el. paštu gavus apmokėjimą. Grąžinimas vykdomas pagal grąžinimo sąlygas.
      </p>
    </PolicyPage>
  )
}
