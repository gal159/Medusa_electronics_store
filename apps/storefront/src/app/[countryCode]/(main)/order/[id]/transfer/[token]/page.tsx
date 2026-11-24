import { Heading, Text } from "@modules/common/components/ui"
import TransferActions from "@modules/order/components/transfer-actions"
import TransferImage from "@modules/order/components/transfer-image"

export default async function TransferPage({
  params,
}: {
  params: Promise<{ id: string; token: string }>
}) {
  const { id, token } = await params

  return (
    <div className="flex flex-col gap-y-4 items-start w-2/5 mx-auto mt-10 mb-20">
      <TransferImage />
      <div className="flex flex-col gap-y-6">
        <Heading level="h1" className="text-xl text-zinc-900">
          Užsakymo perkėlimo prašymas: {id}
        </Heading>
        <Text className="text-zinc-600">
          Gavote prašymą perkelti jūsų užsakymo ({id}) nuosavybę. Jei sutinkate, patvirtinkite mygtuku žemiau.
        </Text>
        <div className="w-full h-px bg-zinc-200" />
        <Text className="text-zinc-600">
          Patvirtinus, naujasis savininkas perims visas su užsakymu susijusias teises ir pareigas.
        </Text>
        <Text className="text-zinc-600">
          Jei šio prašymo neatpažįstate ar norite išlaikyti nuosavybę, nieko daryti nereikia.
        </Text>
        <div className="w-full h-px bg-zinc-200" />
        <TransferActions id={id} token={token} />
      </div>
    </div>
  )
}
