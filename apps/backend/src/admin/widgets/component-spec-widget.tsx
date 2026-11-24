import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Badge, Container, Heading, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../lib/sdk"

type ComponentInterface = {
  id: string
  type: string
  pin_count: number
  i2c_addresses: number[] | null
  i2c_address_selectable: boolean
}

type PowerRail = {
  id: string
  label: string
  voltage_v: number
  max_current_ma: number | null
}

type McuCapabilities = {
  digital_pins: number
  analog_inputs: number
  analog_inputs_usable_with_wifi: number | null
  pwm_pins: number
  i2c_buses: number
  spi_buses: number
  uarts: number
  has_wifi: boolean
  io_voltage_v: number
  is_five_volt_tolerant: boolean
}

type ComponentSpec = {
  id: string
  category: string
  supply_voltage_min_v: number | null
  supply_voltage_max_v: number | null
  logic_voltage_v: number | null
  input_high_min_v: number | null
  is_five_volt_tolerant: boolean
  current_typ_ma: number | null
  current_max_ma: number | null
  datasheet_url: string
  datasheet_note: string | null
  notes: string | null
  interfaces: ComponentInterface[]
  power_rails: PowerRail[]
  mcu: McuCapabilities | null
}

const CATEGORY_LABELS: Record<string, string> = {
  mcu_board: "Mikrovaldiklio plokštė",
  sensor: "Jutiklis",
  display: "Ekranas",
  actuator: "Pavara / vykdiklis",
  power: "Maitinimas",
  communication: "Ryšio modulis",
  passive: "Pasyvus komponentas",
  accessory: "Priedas",
  led_controller: "LED valdiklis",
}

const formatVolts = (value: number | null) => (value === null ? "–" : `${value} V`)
const formatMa = (value: number | null) => (value === null ? "–" : `${value} mA`)
const formatHex = (value: number) => `0x${value.toString(16).toUpperCase().padStart(2, "0")}`

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 px-6 py-3">
    <Text size="small" leading="compact" weight="plus" className="text-ui-fg-subtle">
      {label}
    </Text>
    <Text size="small" leading="compact" className="text-right">
      {value}
    </Text>
  </div>
)

/** Produkto puslapyje rodo techninę specifikaciją iš component-spec modulio. */
const ComponentSpecWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const [spec, setSpec] = useState<ComponentSpec | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    let cancelled = false
    sdk.client
      .fetch<{ component_specs: ComponentSpec[] }>("/admin/component-specs", {
        query: { product_id: product.id },
      })
      .then((response) => {
        if (!cancelled) {
          setSpec(response.component_specs[0] ?? null)
          setState("ready")
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState("error")
        }
      })
    return () => {
      cancelled = true
    }
  }, [product.id])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Techninė specifikacija</Heading>
        {spec && <Badge size="2xsmall">{CATEGORY_LABELS[spec.category] ?? spec.category}</Badge>}
      </div>

      {state === "loading" && <Row label="Kraunama" value="…" />}
      {state === "error" && <Row label="Klaida" value="Nepavyko gauti specifikacijos" />}
      {state === "ready" && !spec && (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            Šis produktas dar neturi techninės specifikacijos. Ją galima sukurti per
            <code className="mx-1">POST /admin/component-specs</code>
            arba seed skriptu <code>seed-component-specs.ts</code>.
          </Text>
        </div>
      )}

      {spec && (
        <>
          <Row
            label="Maitinimo įtampa"
            value={
              spec.supply_voltage_min_v === null
                ? "netaikoma"
                : `${formatVolts(spec.supply_voltage_min_v)} – ${formatVolts(spec.supply_voltage_max_v)}`
            }
          />
          <Row label="Loginis lygis (išėjimai)" value={formatVolts(spec.logic_voltage_v)} />
          <Row label="VIH min (įėjimai)" value={formatVolts(spec.input_high_min_v)} />
          <Row label="Toleruoja 5 V įėjimuose" value={spec.is_five_volt_tolerant ? "taip" : "ne"} />
          <Row
            label="Srovė (tip. / maks.)"
            value={`${formatMa(spec.current_typ_ma)} / ${formatMa(spec.current_max_ma)}`}
          />

          {spec.interfaces.length > 0 && (
            <Row
              label="Reikalingos sąsajos"
              value={spec.interfaces
                .map((iface) => {
                  const addresses = iface.i2c_addresses?.length
                    ? ` [${iface.i2c_addresses.map(formatHex).join(", ")}${iface.i2c_address_selectable ? ", keičiamas" : ""}]`
                    : ""
                  return `${iface.type} × ${iface.pin_count} kont.${addresses}`
                })
                .join("; ")}
            />
          )}

          {spec.power_rails.length > 0 && (
            <Row
              label="Suteikiami bėgeliai"
              value={spec.power_rails
                .map(
                  (rail) =>
                    `${rail.label}: ${formatVolts(rail.voltage_v)}${rail.max_current_ma !== null ? `, iki ${formatMa(rail.max_current_ma)}` : ""}`
                )
                .join("; ")}
            />
          )}

          {spec.mcu && (
            <Row
              label="MCU galimybės"
              value={`GPIO ${spec.mcu.digital_pins}, ADC ${spec.mcu.analog_inputs}${
                spec.mcu.analog_inputs_usable_with_wifi !== null
                  ? ` (su Wi-Fi ${spec.mcu.analog_inputs_usable_with_wifi})`
                  : ""
              }, PWM ${spec.mcu.pwm_pins}, I2C ${spec.mcu.i2c_buses}, SPI ${spec.mcu.spi_buses}, UART ${spec.mcu.uarts}; IO ${formatVolts(spec.mcu.io_voltage_v)}${spec.mcu.has_wifi ? ", Wi-Fi" : ""}`}
            />
          )}

          <Row
            label="Datasheet"
            value={
              spec.datasheet_url ? (
                <a
                  href={spec.datasheet_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ui-fg-interactive hover:underline"
                >
                  atidaryti
                </a>
              ) : (
                "TODO(datasheet)"
              )
            }
          />
          {spec.datasheet_note && <Row label="Šaltinio skyriai" value={spec.datasheet_note} />}
          {spec.notes && <Row label="Pastabos" value={spec.notes} />}
        </>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side",
})

export default ComponentSpecWidget
