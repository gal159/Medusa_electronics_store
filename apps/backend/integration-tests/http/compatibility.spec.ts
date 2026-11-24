import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { addToCartWorkflow, createCartWorkflow } from "@medusajs/medusa/core-flows"
import { assertCartKitsOrderable } from "../../src/workflows/hooks/validate-cart-kits"
import { createFixtures, type Fixtures } from "./fixtures"

jest.setTimeout(120 * 1000)

/**
 * Integraciniai API testai (FR-3, FR-5, FR-8, FR-9, FR-10, NFR-2, NFR-3).
 * Paleidžiama tikra Medusa aplikacija su testine DB.
 */
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let fx: Fixtures

    beforeAll(async () => {
      fx = await createFixtures(getContainer())
    })

    const v = (handle: string) => fx.variantByHandle[handle]

    describe("POST /store/kits/validate", () => {
      it("ESP32 + HC-SR04: R3 klaida, rinkinys neužsakomas", async () => {
        const res = await api.post(
          "/store/kits/validate",
          { items: [{ variant_id: v("esp32-devkit-v1"), quantity: 1 }, { variant_id: v("hc-sr04"), quantity: 1 }] },
          fx.storeHeaders
        )

        expect(res.status).toBe(200)
        expect(res.data.report.isOrderable).toBe(false)
        expect(res.data.report.results.find((r: { ruleId: string }) => r.ruleId === "R3").severity).toBe("error")
        expect(res.data.unspecified_variant_ids).toEqual([])
      })

      it("Pico + BME280 + SSD1306: be klaidų", async () => {
        const res = await api.post(
          "/store/kits/validate",
          {
            items: ["raspberry-pi-pico", "bme280-modulis-3v3", "ssd1306-oled-0-96"].map((handle) => ({
              variant_id: v(handle),
              quantity: 1,
            })),
          },
          fx.storeHeaders
        )

        expect(res.data.report.summary.errors).toBe(0)
        expect(res.data.report.isOrderable).toBe(true)
      })

      it("NFR-2: tuščias sąrašas ir neigiamas kiekis → 400", async () => {
        const empty = await api
          .post("/store/kits/validate", { items: [] }, fx.storeHeaders)
          .catch((error) => error.response)
        const negative = await api
          .post("/store/kits/validate", { items: [{ variant_id: v("hc-sr04"), quantity: -1 }] }, fx.storeHeaders)
          .catch((error) => error.response)

        expect(empty.status).toBe(400)
        expect(negative.status).toBe(400)
      })

      it("NFR-3: be publishable key → klaida", async () => {
        const res = await api
          .post("/store/kits/validate", { items: [{ variant_id: v("hc-sr04"), quantity: 1 }] })
          .catch((error) => error.response)
        expect(res.status).toBeGreaterThanOrEqual(400)
      })

      it("nežinomas variantas grąžinamas atskirai, patikra nelūžta", async () => {
        const res = await api.post(
          "/store/kits/validate",
          { items: [{ variant_id: "variant_nera", quantity: 1 }] },
          fx.storeHeaders
        )
        expect(res.data.unknown_variant_ids).toEqual(["variant_nera"])
      })
    })

    describe("/store/kits", () => {
      it("išsaugo rinkinį su eilutėmis ir paskutine patikra", async () => {
        const created = await api.post(
          "/store/kits",
          {
            name: "Robotas",
            items: [{ variant_id: v("arduino-uno-r3"), quantity: 1 }, { variant_id: v("28byj-48-uln2003"), quantity: 3 }],
          },
          fx.storeHeaders
        )

        expect(created.status).toBe(201)
        expect(created.data.kit.status).toBe("draft")

        const fetched = await api.get(`/store/kits/${created.data.kit.id}`, fx.storeHeaders)
        expect(fetched.data.kit.items).toHaveLength(2)
        expect(fetched.data.kit.last_validation.summary.errors).toBe(1)
      })

      it("FR-10: krepšelis su klaidingu rinkiniu blokuojamas, su geru – ne", async () => {
        const container = getContainer()
        const makeCart = async (kitId: string, handles: Array<[string, number]>) => {
          const { result: cart } = await createCartWorkflow(container).run({
            input: { region_id: fx.regionId, sales_channel_id: fx.salesChannelId, currency_code: "eur" },
          })
          await addToCartWorkflow(container).run({
            input: {
              cart_id: cart.id,
              items: handles.map(([handle, quantity]) => ({
                variant_id: v(handle),
                quantity,
                metadata: { kit_id: kitId, kit_name: kitId },
              })),
            },
          })
          return cart.id
        }

        const badCart = await makeCart("kit_blogas", [["arduino-uno-r3", 1], ["28byj-48-uln2003", 3]])
        const goodCart = await makeCart("kit_geras", [["raspberry-pi-pico", 1], ["bme280-modulis-3v3", 1]])

        await expect(assertCartKitsOrderable(container, badCart)).rejects.toThrow(/R4/)
        await expect(assertCartKitsOrderable(container, goodCart)).resolves.toBeUndefined()
      })
    })

    describe("/admin/component-specs", () => {
      it("NFR-3: be autentifikacijos → 401", async () => {
        const res = await api.get("/admin/component-specs").catch((error) => error.response)
        expect(res.status).toBe(401)
      })

      it("grąžina produkto specifikaciją su vaikiniais įrašais", async () => {
        const res = await api.get(
          `/admin/component-specs?product_id=${fx.productByHandle["esp32-devkit-v1"]}`,
          fx.adminHeaders
        )

        const spec = res.data.component_specs[0]
        expect(spec.category).toBe("mcu_board")
        expect(spec.mcu.io_voltage_v).toBeCloseTo(3.3)
        expect(spec.power_rails).toHaveLength(2)
      })

      it("regresija: atnaujinus tik notes, kiti laukai nepakinta", async () => {
        const list = await api.get(
          `/admin/component-specs?product_id=${fx.productByHandle["hc-sr04"]}`,
          fx.adminHeaders
        )
        const before = list.data.component_specs[0]

        const res = await api.post(`/admin/component-specs/${before.id}`, { notes: "testas" }, fx.adminHeaders)

        expect(res.data.component_spec.notes).toBe("testas")
        expect(res.data.component_spec.datasheet_url).toBe(before.datasheet_url)
        expect(res.data.component_spec.is_five_volt_tolerant).toBe(true)
        expect(res.data.component_spec.interfaces).toHaveLength(1)
      })

      it("NFR-2: min > max atmetama su 400", async () => {
        const res = await api
          .post(
            "/admin/component-specs",
            { product_id: "x", category: "sensor", supply_voltage_min_v: 5, supply_voltage_max_v: 3 },
            fx.adminHeaders
          )
          .catch((error) => error.response)
        expect(res.status).toBe(400)
      })

      it("taisyklių sąrašas admin'ui", async () => {
        const res = await api.get("/admin/compatibility/rules", fx.adminHeaders)
        expect(res.data.rules.map((rule: { id: string }) => rule.id)).toEqual([
          "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9",
        ])
      })
    })

    describe("/store/kit-presets", () => {
      it("grąžina LED rinkinio šabloną su pozicijomis", async () => {
        const res = await api.get("/store/kit-presets", fx.storeHeaders)
        const led = res.data.presets.find((preset: { id: string }) => preset.id === "led-rinkinys")
        expect(led).toBeDefined()
        expect(led.slots.map((slot: { key: string }) => slot.key)).toEqual(["psu", "controller", "strip", "sensors"])
      })
    })
  },
})
