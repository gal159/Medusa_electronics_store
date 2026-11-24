import { Metadata } from "next"

import { STORE_NAME } from "@lib/util/site"
import { PlaceholderNotice, PolicyPage } from "@modules/policies/templates"

export const dynamic = "force-static"
export const revalidate = 60

export const metadata: Metadata = {
  title: "Privatumo politika",
  description: `Kaip ${STORE_NAME} renka ir naudoja asmens duomenis.`,
}

export default function PrivacyPage() {
  return (
    <PolicyPage title="Privatumo politika">
      <PlaceholderNotice />
      <p>
        {STORE_NAME} renka apmokant pateiktus duomenis (vardą, el. paštą, pristatymo adresą), kad galėtų įvykdyti ir pristatyti užsakymą.
      </p>
      <p>
        Mokėjimo duomenis tvarko mokėjimų paslaugų teikėjas, parduotuvė jų nesaugo. Slapukai naudojami krepšeliui ir prisijungimo sesijai išlaikyti.
      </p>
    </PolicyPage>
  )
}
