/**
 * Etaloniniai rinkiniai 5 uždaviniui (patikros teisingumo įvertinimas).
 *
 * `expected` nustatytas RANKOMIS pagal datasheet vertes (`component-spec-data.ts`), ne
 * paleidus variklį: tai „tiesa“, su kuria lyginamas sistemos rezultatas.
 * Lyginami tik `error` ir `warning` rezultatai; `info` (R8 priedai, R4
 * nežinoma srovė) yra patarimai ir į teisingumo matą neįtraukiami.
 */
import type { Handle } from "./kit-fixtures"

export type ExpectedFinding = { ruleId: string; severity: "error" | "warning" }

export type ReferenceKit = {
  id: string
  name: string
  items: Array<[Handle, number]>
  expected: ExpectedFinding[]
  /** Kodėl tikimasi būtent to (datasheet argumentas). */
  rationale: string
}

export const REFERENCE_KITS: ReferenceKit[] = [
  {
    id: "E1",
    name: "Meteo stotelė: Pico + BME280 + SSD1306",
    items: [["raspberry-pi-pico", 1], ["bme280-modulis-3v3", 1], ["ssd1306-oled-0-96", 1]],
    expected: [],
    rationale: "Visi 3,3 V; BME280 1,71–3,6 V ir SSD1306 1,65–3,3 V tinka Pico 3V3; adresai 0x76 ir 0x3C skirtingi.",
  },
  {
    id: "E2",
    name: "Atstumo matuoklis: ESP32 + HC-SR04",
    items: [["esp32-devkit-v1", 1], ["hc-sr04", 1]],
    expected: [{ ruleId: "R3", severity: "error" }],
    rationale: "HC-SR04 ECHO 5 V TTL, ESP32 įėjimų abs. max 3,6 V (Table 5-1).",
  },
  {
    id: "E3",
    name: "Dvigubas BME280 prie Uno",
    items: [["arduino-uno-r3", 1], ["bme280-modulis-3v3", 2]],
    expected: [
      { ruleId: "R3", severity: "error" },
      { ruleId: "R5", severity: "warning" },
    ],
    rationale:
      "Uno I2C 5 V lygis viršija BME280 VDDIO max 3,6 V; antram BME280 reikia SDO→VDDIO (0x77).",
  },
  {
    id: "E4",
    name: "Robotas: Uno + 3× 28BYJ-48 iš USB",
    items: [["arduino-uno-r3", 1], ["28byj-48-uln2003", 3]],
    expected: [{ ruleId: "R4", severity: "error" }],
    rationale: "3 × 215 mA = 645 mA > 500 mA (USB 2.0); 12 GPIO ≤ 14.",
  },
  {
    id: "E5",
    name: "Be mikrovaldiklio: HC-SR04 + SG90",
    items: [["hc-sr04", 1], ["sg90-servo", 1]],
    expected: [{ ruleId: "R1", severity: "error" }],
    rationale: "Nėra mcu_board.",
  },
  {
    id: "E6",
    name: "ESP32 + HC-SR04 su BSS138 keitikliu",
    items: [["esp32-devkit-v1", 1], ["hc-sr04", 1], ["lygiu-keitiklis-bss138-4ch", 1]],
    expected: [],
    rationale: "Keitiklis (LV ≥ 1,8 V, HV ≤ 10 V) išsprendžia 5 V → 3,3 V; lieka tik nurodymas (info).",
  },
  {
    id: "E7",
    name: "LED juosta: ESP32 + WS2812B",
    items: [["esp32-devkit-v1", 1], ["ws2812b-juosta-1m", 1]],
    expected: [
      { ruleId: "R3", severity: "warning" },
      { ruleId: "R4", severity: "error" },
    ],
    rationale:
      "WS2812B VIH = 0,7 × 5 V = 3,5 V > ESP32 3,3 V išėjimas. 1 m juostos maks. 11 W/m (BTF-LIGHTING) = 2 200 mA > USB 500 mA. (2026-11-23 papildyta R4, kai atsirado juostos srovės duomenys.)",
  },
  {
    id: "E8",
    name: "Radijo mazgas: Uno + nRF24L01+",
    items: [["arduino-uno-r3", 1], ["nrf24l01-plus", 1]],
    expected: [],
    rationale: "nRF24L01+ 1,9–3,6 V → Uno 3V3; įėjimai 5 V tolerantiški; 13,5 mA < 50 mA.",
  },
  {
    id: "E9",
    name: "Du OLED ekranai prie Pico",
    items: [["raspberry-pi-pico", 1], ["ssd1306-oled-0-96", 2]],
    expected: [{ ruleId: "R5", severity: "error" }],
    rationale: "SSD1306 0x3C (SA0); kataloge modulio adresas laikomas nekeičiamu.",
  },
  {
    id: "E10",
    name: "Keturi varikliai prie Uno",
    items: [["arduino-uno-r3", 1], ["28byj-48-uln2003", 4]],
    expected: [
      { ruleId: "R4", severity: "error" },
      { ruleId: "R6", severity: "error" },
    ],
    rationale: "4 × 215 mA = 860 mA > 500 mA; 4 × 4 = 16 GPIO > 14.",
  },
  {
    id: "E11",
    name: "Du Bluetooth moduliai prie Uno",
    items: [["arduino-uno-r3", 1], ["hc-05-bluetooth", 2]],
    expected: [
      { ruleId: "R3", severity: "error" },
      { ruleId: "R6", severity: "error" },
    ],
    rationale: "HC-05 I/O 1,8–3,6 V, Uno TX 5 V; reikia 2 UART, Uno turi 1.",
  },
  {
    id: "E12",
    name: "LCD1602 I2C prie Pico",
    items: [["raspberry-pi-pico", 1], ["lcd-1602-i2c", 1]],
    expected: [{ ruleId: "R3", severity: "error" }],
    rationale: "PCF8574 adapterio SDA/SCL pull-up į 5 V, Pico VPIN max IOVDD + 0,5 = 3,8 V.",
  },
  {
    id: "E13",
    name: "Judesio stotelė: ESP32 + MPU-6050 + BME280 + SSD1306",
    items: [
      ["esp32-devkit-v1", 1],
      ["mpu-6050-gy-521", 1],
      ["bme280-modulis-3v3", 1],
      ["ssd1306-oled-0-96", 1],
    ],
    expected: [],
    rationale: "Visi 3,3 V; adresai 0x68, 0x76, 0x3C skirtingi; viena I2C magistralė = 2 GPIO.",
  },
]
