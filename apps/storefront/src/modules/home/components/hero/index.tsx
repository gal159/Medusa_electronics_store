import { Button, Heading } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = () => {
  return (
    <div className="h-[75vh] w-full border-b border-ui-border-base relative bg-ui-bg-subtle">
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center small:p-32 gap-6">
        <span>
          <Heading level="h1" className="text-3xl leading-10 text-ui-fg-base font-normal">
            Elektronikos komponentai mikrovaldiklių projektams
          </Heading>
          <Heading level="h2" className="text-3xl leading-10 text-ui-fg-subtle font-normal">
            Sudarykite rinkinį, o suderinamumą patikrinsime pagal gamintojų duomenis
          </Heading>
        </span>
        <div className="flex gap-3">
          <LocalizedClientLink href="/configurator">
            <Button variant="primary">Konfigūruoti rinkinį</Button>
          </LocalizedClientLink>
          <LocalizedClientLink href="/store">
            <Button variant="secondary">Visi komponentai</Button>
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}

export default Hero
