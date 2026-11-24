"use client"

import { resetOnboardingState } from "@lib/data/onboarding"
import { Button, Container, Text } from "@modules/common/components/ui"

const OnboardingCta = ({ orderId }: { orderId: string }) => {
  return (
    <Container className="max-w-4xl h-full bg-ui-bg-subtle w-full">
      <div className="flex flex-col gap-y-4 center p-4 md:items-center">
        <Text className="text-ui-fg-base text-xl">
          Testinis užsakymas sukurtas.
        </Text>
        <Text className="text-ui-fg-subtle text-small-regular">
          Parduotuvės nustatymus galite užbaigti administravimo skydelyje.
        </Text>
        <Button
          className="w-fit"
          size="large"
          onClick={() => resetOnboardingState(orderId)}
        >
          Užbaigti administravimo skydelyje
        </Button>
      </div>
    </Container>
  )
}

export default OnboardingCta
