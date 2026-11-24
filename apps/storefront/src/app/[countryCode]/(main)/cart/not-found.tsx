import { Metadata } from "next"

import InteractiveLink from "@modules/common/components/interactive-link"

export const metadata: Metadata = {
  title: "404",
  description: "Įvyko klaida",
}

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-2xl-semi text-ui-fg-base">Puslapis nerastas</h1>
      <p className="text-small-regular text-ui-fg-base">
        Krepšelis neegzistuoja. Išvalykite slapukus ir bandykite dar kartą.
      </p>
      <InteractiveLink href="/">Į pradžią</InteractiveLink>
    </div>
  )
}
