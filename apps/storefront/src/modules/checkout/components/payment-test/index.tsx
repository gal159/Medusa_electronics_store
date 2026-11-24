import { Badge } from "@modules/common/components/ui"

const PaymentTest = ({ className }: { className?: string }) => {
  return (
    <Badge color="orange" className={className}>
      <span className="font-semibold">Dėmesio:</span> Tik testavimui.
    </Badge>
  )
}

export default PaymentTest
