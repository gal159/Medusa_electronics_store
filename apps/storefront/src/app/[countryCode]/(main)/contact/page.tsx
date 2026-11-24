import { Metadata } from "next"

import { STORE_NAME } from "@lib/util/site"
import { PlaceholderNotice, PolicyPage } from "@modules/policies/templates"

export const dynamic = "force-static"
export const revalidate = 60

export const metadata: Metadata = {
  title: "Kontaktai",
  description: `Kaip susisiekti su ${STORE_NAME}.`,
}

export default function ContactPage() {
  return (
    <PolicyPage title="Kontaktai">
      <PlaceholderNotice />
      <p>
        Klausimų dėl užsakymo, pristatymo ar grąžinimo? Rašykite {STORE_NAME}{" "}
        klientų aptarnavimui ir nurodykite užsakymo numerį.
      </p>
    </PolicyPage>
  )
}
