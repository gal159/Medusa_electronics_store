import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"

/** Medusa užsakymo ir mokėjimo būsenų kodai lietuviškai. */
const STATUS_LABELS: Record<string, string> = {
  not_fulfilled: "Neįvykdytas",
  partially_fulfilled: "Iš dalies įvykdytas",
  fulfilled: "Įvykdytas",
  partially_shipped: "Iš dalies išsiųstas",
  shipped: "Išsiųstas",
  partially_delivered: "Iš dalies pristatytas",
  delivered: "Pristatytas",
  canceled: "Atšauktas",
  not_paid: "Neapmokėtas",
  awaiting: "Laukiama apmokėjimo",
  authorized: "Autorizuotas",
  partially_authorized: "Iš dalies autorizuotas",
  captured: "Apmokėtas",
  partially_captured: "Iš dalies apmokėtas",
  partially_refunded: "Iš dalies grąžintas",
  refunded: "Grąžintas",
  requires_action: "Reikia veiksmo",
}

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  const formatStatus = (str: string) => {
    if (STATUS_LABELS[str]) {
      return STATUS_LABELS[str]
    }
    const formatted = str.split("_").join(" ")

    return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
  }

  return (
    <div>
      <Text>
        Užsakymo patvirtinimą išsiuntėme adresu{" "}
        <span
          className="text-ui-fg-medium-plus font-semibold"
          data-testid="order-email"
        >
          {order.email}
        </span>
        .
      </Text>
      <Text className="mt-2">
        Užsakymo data:{" "}
        <span data-testid="order-date">
          {new Date(order.created_at).toDateString()}
        </span>
      </Text>
      <Text className="mt-2 text-ui-fg-interactive">
        Užsakymo numeris: <span data-testid="order-id">{order.display_id}</span>
      </Text>

      <div className="flex items-center text-compact-small gap-x-4 mt-4">
        {showStatus && (
          <>
            <Text>
              Užsakymo būsena:{" "}
              <span className="text-ui-fg-subtle " data-testid="order-status">
                {formatStatus(order.fulfillment_status)}
              </span>
            </Text>
            <Text>
              Mokėjimo būsena:{" "}
              <span
                className="text-ui-fg-subtle "
                sata-testid="order-payment-status"
              >
                {formatStatus(order.payment_status)}
              </span>
            </Text>
          </>
        )}
      </div>
    </div>
  )
}

export default OrderDetails
