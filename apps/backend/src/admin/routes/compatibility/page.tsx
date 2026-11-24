import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShieldCheck } from "@medusajs/icons"
import { Badge, Container, Heading, Table, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type Rule = { id: string; name: string; description: string }

type PresetSlot = {
  key: string
  label: string
  allowedHandles: string[]
  default?: { handle: string; variantTitle?: string; quantity?: number }
  optional?: boolean
  multiple?: boolean
  quantity?: { label: string; min: number; max: number }
}

type Preset = { id: string; name: string; description: string; slots: PresetSlot[] }

type SpecRow = {
  id: string
  category: string
  datasheet_url: string
  notes: string | null
  product?: { id: string; title: string; handle: string } | null
}

/**
 * Admin puslapis „Suderinamumas“: registruotos taisyklės ir specifikacijų
 * būklė (kurios neturi datasheet nuorodos ar turi TODO pastabų).
 */
const CompatibilityPage = () => {
  const [rules, setRules] = useState<Rule[]>([])
  const [specs, setSpecs] = useState<SpecRow[]>([])
  const [presets, setPresets] = useState<Preset[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      sdk.client.fetch<{ rules: Rule[] }>("/admin/compatibility/rules"),
      sdk.client.fetch<{ component_specs: SpecRow[] }>("/admin/component-specs", {
        query: { limit: 200 },
      }),
      sdk.client.fetch<{ presets: Preset[] }>("/admin/kit-presets"),
    ])
      .then(([rulesResponse, specsResponse, presetsResponse]) => {
        setRules(rulesResponse.rules)
        setSpecs(specsResponse.component_specs)
        setPresets(presetsResponse.presets)
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  const needsReview = specs.filter(
    (spec) => !spec.datasheet_url || (spec.notes ?? "").includes("TODO(datasheet)")
  )

  return (
    <div className="flex flex-col gap-4">
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h1">Suderinamumo taisyklės</Heading>
          <Badge size="2xsmall">{rules.length} taisyklės</Badge>
        </div>
        {error && (
          <div className="px-6 py-4">
            <Text className="text-ui-fg-error">{error}</Text>
          </div>
        )}
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>ID</Table.HeaderCell>
              <Table.HeaderCell>Pavadinimas</Table.HeaderCell>
              <Table.HeaderCell>Aprašymas</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rules.map((rule) => (
              <Table.Row key={rule.id}>
                <Table.Cell>
                  <Badge size="2xsmall">{rule.id}</Badge>
                </Table.Cell>
                <Table.Cell>{rule.name}</Table.Cell>
                <Table.Cell className="whitespace-normal">{rule.description}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        <div className="px-6 py-3">
          <Text size="small" className="text-ui-fg-subtle">
            Taisyklės apibrėžtos kode (src/modules/compatibility/engine/rules). Nauja taisyklė:
            naujas failas ir įrašas rules/index.ts.
          </Text>
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Rinkinių šablonai</Heading>
          <Badge size="2xsmall">{presets.length}</Badge>
        </div>
        {presets.map((preset) => (
          <div key={preset.id} className="px-6 py-4 flex flex-col gap-2">
            <Text weight="plus">{preset.name}</Text>
            <Text size="small" className="text-ui-fg-subtle">{preset.description}</Text>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Pozicija</Table.HeaderCell>
                  <Table.HeaderCell>Leidžiamos prekės</Table.HeaderCell>
                  <Table.HeaderCell>Numatytoji</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {preset.slots.map((slot) => (
                  <Table.Row key={slot.key}>
                    <Table.Cell>
                      {slot.label}
                      {slot.optional ? " (nebūtina)" : ""}
                      {slot.quantity ? ` · ${slot.quantity.label} ${slot.quantity.min}–${slot.quantity.max}` : ""}
                    </Table.Cell>
                    <Table.Cell className="whitespace-normal">{slot.allowedHandles.join(", ")}</Table.Cell>
                    <Table.Cell className="whitespace-normal">
                      {slot.default
                        ? `${slot.default.handle}${slot.default.variantTitle ? ` (${slot.default.variantTitle})` : ""}${slot.default.quantity ? ` × ${slot.default.quantity}` : ""}`
                        : "–"}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        ))}
        <div className="px-6 py-3">
          <Text size="small" className="text-ui-fg-subtle">
            Šablonai aprašyti kode (src/lib/kit-presets.ts).
          </Text>
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Specifikacijos, kurias reikia patikrinti</Heading>
          <Badge size="2xsmall" color={needsReview.length ? "orange" : "green"}>
            {needsReview.length} iš {specs.length}
          </Badge>
        </div>
        {needsReview.length === 0 ? (
          <div className="px-6 py-4">
            <Text size="small">Visos specifikacijos turi datasheet ir patvirtintas vertes.</Text>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Produktas</Table.HeaderCell>
                <Table.HeaderCell>Kategorija</Table.HeaderCell>
                <Table.HeaderCell>Kas trūksta</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {needsReview.map((spec) => (
                <Table.Row key={spec.id}>
                  <Table.Cell>
                    {spec.product ? (
                      <a
                        href={`/app/products/${spec.product.id}`}
                        className="text-ui-fg-interactive hover:underline"
                      >
                        {spec.product.title}
                      </a>
                    ) : (
                      spec.id
                    )}
                  </Table.Cell>
                  <Table.Cell>{spec.category}</Table.Cell>
                  <Table.Cell className="whitespace-normal">
                    {!spec.datasheet_url ? "Nėra datasheet nuorodos. " : ""}
                    {(spec.notes ?? "").includes("TODO(datasheet)") ? spec.notes : ""}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Suderinamumas",
  icon: ShieldCheck,
})

export default CompatibilityPage
