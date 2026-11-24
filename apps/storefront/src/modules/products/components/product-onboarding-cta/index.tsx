import { Button, Container, Text } from "@modules/common/components/ui"
import { cookies as nextCookies } from "next/headers"

async function ProductOnboardingCta() {
  const cookies = await nextCookies()

  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"

  if (!isOnboarding) {
    return null
  }

  return (
    <Container className="max-w-4xl h-full bg-ui-bg-subtle w-full p-8">
      <div className="flex flex-col gap-y-4 center">
        <Text className="text-ui-fg-base text-xl">
          Demonstracinė prekė sukurta.
        </Text>
        <Text className="text-ui-fg-subtle text-small-regular">
          Parduotuvės nustatymus galite tęsti administravimo skydelyje.
        </Text>
        <a href="http://localhost:7001/a/orders?onboarding_step=create_order_nextjs">
          <Button className="w-full">Tęsti administravimo skydelyje</Button>
        </a>
      </div>
    </Container>
  )
}

export default ProductOnboardingCta
