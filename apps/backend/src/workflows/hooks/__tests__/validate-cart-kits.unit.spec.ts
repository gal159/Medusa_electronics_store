import { evaluateKit } from "../../../modules/compatibility/engine"
import { item, kit } from "../../../modules/compatibility/engine/__tests__/kit-fixtures"
import {
  findBlockingKits,
  formatBlockingMessage,
  groupCartLinesByKit,
} from "../validate-cart-kits"

describe("validate-cart-kits hook (gryna dalis)", () => {
  it("grupuoja krepšelio eilutes pagal metadata.kit_id ir ignoruoja pavienes", () => {
    const groups = groupCartLinesByKit([
      { id: "li_1", variant_id: "v_esp32", quantity: 1, metadata: { kit_id: "kit_a", kit_name: "A" } },
      { id: "li_2", variant_id: "v_hcsr04", quantity: 2, metadata: { kit_id: "kit_a", kit_name: "A" } },
      { id: "li_3", variant_id: "v_uno", quantity: 1, metadata: { kit_id: "kit_b" } },
      { id: "li_4", variant_id: "v_wire", quantity: 1, metadata: null },
      { id: "li_5", variant_id: null, quantity: 1, metadata: { kit_id: "kit_a" } },
    ])

    expect(groups).toEqual([
      {
        kitId: "kit_a",
        kitName: "A",
        items: [
          { variant_id: "v_esp32", quantity: 1 },
          { variant_id: "v_hcsr04", quantity: 2 },
        ],
      },
      { kitId: "kit_b", kitName: "kit_b", items: [{ variant_id: "v_uno", quantity: 1 }] },
    ])
  })

  it("blokuoja tik rinkinius su klaidomis (ESP32 + HC-SR04), praleidžia švarius (Pico + BME280)", () => {
    const groups = [
      { kitId: "bad", kitName: "Atstumo matuoklis", items: [] },
      { kitId: "good", kitName: "Meteo stotelė", items: [] },
    ]
    const reports = new Map([
      ["bad", evaluateKit(kit(item("esp32-devkit-v1"), item("hc-sr04")))],
      ["good", evaluateKit(kit(item("raspberry-pi-pico"), item("bme280-modulis-3v3")))],
    ])

    const blocking = findBlockingKits(groups, reports)

    expect(blocking).toHaveLength(1)
    expect(blocking[0].kitName).toBe("Atstumo matuoklis")
    expect(blocking[0].errors[0]).toMatch(/^R3: /)
  })

  it("pranešimas naudotojui įvardija rinkinį ir taisykles", () => {
    const message = formatBlockingMessage([
      { kitName: "Robotas", errors: ["R4: Bėgelis perkrautas"] },
    ])
    expect(message).toContain("„Robotas“")
    expect(message).toContain("R4")
    expect(message).toContain("konfigūratoriuje")
  })
})
