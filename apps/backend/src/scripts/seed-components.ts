/**
 * Katalogo seed: realūs elektronikos komponentai, parduodami kaip moduliai
 * (breakout plokštės), po vieną variantą kiekvienam.
 *
 *   npx medusa exec ./src/scripts/seed-components.ts
 *
 * Idempotentiškas: produktai atpažįstami pagal `handle`, esami praleidžiami,
 * trūkstami inventoriaus lygiai sukuriami tik ten, kur jų nėra.
 * Kelių variantų prekėms (`variantOption`) variantai sinchronizuojami pagal
 * SKU: nebeaprašyti pašalinami, nauji sukuriami, esami (ir jų admin'e
 * pakeistos kainos) paliekami; parinkties reikšmės ir tvarka atnaujinamos.
 *
 * Čia saugomi tik komerciniai duomenys (pavadinimas, aprašymas, kaina).
 * Techniniai parametrai (įtampos, srovės, I2C adresai, loginiai lygiai)
 * laikomi `component-spec` modulyje su datasheet nuorodomis (2 etapas),
 * todėl aprašymuose skaitinių parametrų sąmoningai nėra (vienas šaltinis – `component-spec-data.ts`).
 */
import {
  createAndLinkProductOptionsToProductWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createProductVariantsWorkflow,
  deleteProductVariantsWorkflow,
  updateProductOptionsWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import type { ExecArgs, MedusaContainer } from "@medusajs/framework/types"
import { COMPONENT_CATEGORIES } from "../lib/component-categories"

/** Produktai kuriami dalimis, kad viena klaida neatšauktų viso katalogo. */
const BATCH_SIZE = 10
/** Produktų kiekis vienam search indekso ingest kvietimui. */
const INGEST_CHUNK_SIZE = 25
/** Pradinis likutis sandėlyje kiekvienam variantui. */
const INITIAL_STOCK = 50

type ComponentSeed = {
  /** Kategorijos handle iš COMPONENT_CATEGORIES. */
  category: (typeof COMPONENT_CATEGORIES)[number]["handle"]
  handle: string
  sku: string
  title: string
  subtitle: string
  description: string
  /** Kaina EUR (pagrindiniais vienetais, pvz., 12.9 = 12,90 EUR). */
  priceEur: number
  /** Svoris gramais siuntimo skaičiavimams. */
  weightG: number
  /**
   * Keli variantai vienos parinkties pagrindu (pvz., maitinimo šaltinio srovė).
   * Jei nenurodyta, kuriamas vienas variantas „Standartinis“ su `sku` ir `priceEur`.
   */
  variantOption?: {
    title: string
    variants: Array<{
      value: string
      sku: string
      priceEur: number
      /** Varianto techniniai duomenys, kurių nėra prekės specifikacijoje (žr. snapshot.ts). */
      metadata?: Record<string, unknown>
    }>
  }
}

/**
 * Maitinimo šaltinių variantai: srovė (A), vardinė galia pagal gamintojo
 * ženklinimą (W, jei nurodyta) ir orientacinė kaina EUR (keičiama admin'e).
 * 24 V eilutė pagal tiekėjo modelių eilę 24V1A25W … 24V20A480W.
 */
type PsuVariant = { currentA: number; powerW?: number; priceEur: number }

const PSU_VARIANTS: Record<5 | 12 | 24, PsuVariant[]> = {
  5: [
    { currentA: 2, priceEur: 6.9 },
    { currentA: 5, priceEur: 9.9 },
    { currentA: 6, priceEur: 10.9 },
    { currentA: 8, priceEur: 12.9 },
    { currentA: 10, priceEur: 14.9 },
  ],
  12: [
    { currentA: 2, priceEur: 7.9 },
    { currentA: 5, priceEur: 10.9 },
    { currentA: 6, priceEur: 11.9 },
    { currentA: 8, priceEur: 13.9 },
    { currentA: 10, priceEur: 15.9 },
  ],
  24: [
    { currentA: 1, powerW: 25, priceEur: 6.9 },
    { currentA: 2, powerW: 48, priceEur: 8.9 },
    { currentA: 3, powerW: 72, priceEur: 10.9 },
    { currentA: 5, powerW: 120, priceEur: 12.9 },
    { currentA: 6.2, powerW: 150, priceEur: 14.9 },
    { currentA: 10, powerW: 240, priceEur: 19.9 },
    { currentA: 12.5, powerW: 300, priceEur: 23.9 },
    { currentA: 15, powerW: 350, priceEur: 27.9 },
    { currentA: 20, powerW: 480, priceEur: 34.9 },
  ],
}

/** „6,2 A / 150 W“ – lietuviškas dešimtainis kablelis. */
function psuVariantLabel({ currentA, powerW }: PsuVariant): string {
  const current = `${currentA.toLocaleString("lt-LT")} A`
  return powerW ? `${current} / ${powerW} W` : current
}

function psuSeed(voltageV: 5 | 12 | 24): ComponentSeed {
  const variants = PSU_VARIANTS[voltageV]
  const hasPower = variants.some((variant) => variant.powerW)
  return {
    category: "maitinimas",
    handle: `led-maitinimo-saltinis-${voltageV}v`,
    sku: `PWR-PSU-${voltageV}V`,
    title: `LED maitinimo šaltinis ${voltageV} V`,
    subtitle: "Impulsinis maitinimo blokas metaliniame korpuse, 230 V AC įėjimas",
    description: `Stabilizuotas ${voltageV} V DC impulsinis maitinimo šaltinis su gnybtų bloku, skirtas LED juostoms, varikliams ir didesnės srovės projektams. Įėjimas 110/230 V AC (perjungiamas). Pasirinkite reikiamą srovę: šaltinis turi būti bent 20 % galingesnis už visų prijungtų įrenginių suminę srovę.`,
    priceEur: variants[0].priceEur,
    weightG: 400,
    variantOption: {
      title: hasPower ? "Srovė / galia" : "Srovė",
      variants: variants.map((variant) => ({
        value: psuVariantLabel(variant),
        sku: `PWR-PSU-${voltageV}V-${variant.currentA}A${variant.powerW ? `-${variant.powerW}W` : ""}`,
        priceEur: variant.priceEur,
        metadata: { rail_max_current_ma: Math.round(variant.currentA * 1000) },
      })),
    },
  }
}

export const COMPONENTS: ComponentSeed[] = [
  psuSeed(5),
  psuSeed(12),
  psuSeed(24),
  // --- Mikrovaldikliai -----------------------------------------------------
  {
    category: "mikrovaldikliai",
    handle: "esp32-devkit-v1",
    sku: "MCU-ESP32-DEVKIT-V1",
    title: "ESP32 DevKit V1 (ESP32-WROOM-32)",
    subtitle: "Wi-Fi ir Bluetooth mikrovaldiklio plokštė",
    description:
      "Populiari ESP32 kūrimo plokštė su integruotu Wi-Fi ir Bluetooth, Micro-USB programavimo jungtimi ir įtampos reguliatoriumi. Tinka IoT projektams, duomenų siuntimui į debesį ir belaidžiam valdymui. Programuojama Arduino IDE, PlatformIO arba ESP-IDF.",
    priceEur: 9.9,
    weightG: 12,
  },
  {
    category: "mikrovaldikliai",
    handle: "arduino-uno-r3",
    sku: "MCU-ARDUINO-UNO-R3",
    title: "Arduino Uno R3",
    subtitle: "Klasikinė ATmega328P mokomoji plokštė",
    description:
      "Labiausiai paplitusi pradedančiųjų mikrovaldiklio plokštė su ATmega328P, USB-B jungtimi ir standartiniu Arduino plėtimo plokščių (shield) išdėstymu. Didžiausia pamokų ir bibliotekų bazė.",
    priceEur: 24.9,
    weightG: 25,
  },
  {
    category: "mikrovaldikliai",
    handle: "raspberry-pi-pico",
    sku: "MCU-RPI-PICO",
    title: "Raspberry Pi Pico",
    subtitle: "RP2040 dviejų branduolių mikrovaldiklis",
    description:
      "Raspberry Pi Foundation mikrovaldiklio plokštė su RP2040 lustu, programuojama MicroPython arba C/C++ SDK. Pasižymi programuojamais I/O (PIO) blokais netipinėms sąsajoms.",
    priceEur: 5.9,
    weightG: 3,
  },
  {
    category: "mikrovaldikliai",
    handle: "arduino-nano",
    sku: "MCU-ARDUINO-NANO",
    title: "Arduino Nano (ATmega328P)",
    subtitle: "Kompaktiška maketavimo plokštei skirta plokštė",
    description:
      "Mažo formato Arduino plokštė su tais pačiais galimybėmis kaip Uno, bet pritaikyta tiesiogiai įstatyti į maketavimo plokštę. Mini-USB jungtis.",
    priceEur: 12.9,
    weightG: 7,
  },

  // --- Jutikliai -----------------------------------------------------------
  {
    category: "jutikliai",
    handle: "bme280-modulis-3v3",
    sku: "SEN-BME280-3V3",
    title: "BME280 temperatūros, drėgmės ir slėgio jutiklis (I2C/SPI)",
    subtitle: "Bosch BME280 breakout modulis",
    description:
      "Trys aplinkos parametrai viename lusto modulyje: temperatūra, santykinė drėgmė ir atmosferos slėgis. Jungiamas per I2C arba SPI sąsają. Tinka meteorologinėms stotelėms ir aukščio matavimui.",
    priceEur: 6.5,
    weightG: 2,
  },
  {
    category: "jutikliai",
    handle: "dht22-am2302",
    sku: "SEN-DHT22",
    title: "DHT22 / AM2302 temperatūros ir drėgmės jutiklis",
    subtitle: "Vieno laido skaitmeninis jutiklis",
    description:
      "Kalibruotas skaitmeninis temperatūros ir drėgmės jutiklis su vieno laido duomenų protokolu. Tikslesnis už DHT11 pirmtaką. Plačiai palaikomas Arduino ir MicroPython bibliotekose.",
    priceEur: 5.9,
    weightG: 4,
  },
  {
    category: "jutikliai",
    handle: "hc-sr04",
    sku: "SEN-HC-SR04",
    title: "HC-SR04 ultragarsinis atstumo jutiklis",
    subtitle: "Atstumo matavimas ultragarsu",
    description:
      "Ultragarsinis atstumo jutiklis su TRIG ir ECHO kontaktais. Matuoja atstumą iki kliūties pagal garso impulso grįžimo laiką. Dažnas robotų kliūčių aptikimo ir lygio matavimo projektuose.",
    priceEur: 2.9,
    weightG: 9,
  },
  {
    category: "jutikliai",
    handle: "mpu-6050-gy-521",
    sku: "SEN-MPU6050",
    title: "MPU-6050 akselerometras ir giroskopas (GY-521)",
    subtitle: "6 ašių inercinis jutiklis, I2C",
    description:
      "Šešių ašių judesio jutiklis su trijų ašių akselerometru ir trijų ašių giroskopu viename luste. Jungiamas per I2C. Tinka orientacijos nustatymui, dronams, balansuojantiems robotams.",
    priceEur: 4.5,
    weightG: 3,
  },
  {
    category: "jutikliai",
    handle: "bh1750",
    sku: "SEN-BH1750",
    title: "BH1750 apšvietimo jutiklis (I2C)",
    subtitle: "Skaitmeninis liukso matuoklis",
    description:
      "Skaitmeninis aplinkos apšviestumo jutiklis, grąžinantis reikšmę liuksais per I2C sąsają. Naudojamas automatiniam ekranų ryškumui ir apšvietimo valdymui.",
    priceEur: 3.5,
    weightG: 2,
  },
  {
    category: "jutikliai",
    handle: "ds18b20-waterproof",
    sku: "SEN-DS18B20-WP",
    title: "DS18B20 hermetiškas temperatūros jutiklis",
    subtitle: "1-Wire zondas su kabeliu",
    description:
      "Skaitmeninis temperatūros jutiklis nerūdijančio plieno korpuse su kabeliu. Veikia 1-Wire magistrale, todėl prie vieno kontakto galima prijungti kelis jutiklius. Tinka skysčių ir lauko temperatūrai.",
    priceEur: 3.9,
    weightG: 15,
  },
  {
    category: "jutikliai",
    handle: "pir-hc-sr501",
    sku: "SEN-PIR-HC-SR501",
    title: "HC-SR501 PIR judesio jutiklis",
    subtitle: "Infraraudonųjų spindulių judesio jutiklis su reguliuojamu atstumu ir laiku",
    description:
      "Pasyvus infraraudonųjų spindulių jutiklis aptinka žmogaus judesį ir nustatytam laikui įjungia skaitmeninį išėjimą. Jautrumas ir išlaikymo laikas reguliuojami potenciometrais. Tinka automatiniam apšvietimui ir signalizacijai.",
    priceEur: 2.9,
    weightG: 8,
  },

  // --- Ekranai -------------------------------------------------------------
  {
    category: "ekranai",
    handle: "ssd1306-oled-0-96",
    sku: "DSP-SSD1306-096",
    title: "0,96\" OLED ekranas 128x64 (SSD1306, I2C)",
    subtitle: "Monochrominis OLED modulis",
    description:
      "Mažas monochrominis OLED ekranas su SSD1306 valdikliu ir I2C sąsaja (4 kontaktai). Aiškus kontrastas, nereikia foninio apšvietimo. Palaikomas Adafruit GFX ir u8g2 bibliotekų.",
    priceEur: 5.9,
    weightG: 5,
  },
  {
    category: "ekranai",
    handle: "lcd-1602-i2c",
    sku: "DSP-LCD1602-I2C",
    title: "LCD 1602 ekranas su I2C adapteriu (PCF8574)",
    subtitle: "2 eilutės po 16 simbolių",
    description:
      "Klasikinis simbolinis LCD ekranas su mėlynu foniniu apšvietimu ir prilituotu PCF8574 I2C adapteriu, todėl užtenka 4 laidų. Tinka būsenos ir matavimų rodymui.",
    priceEur: 6.9,
    weightG: 40,
  },

  // --- Pavaros ir vykdikliai -----------------------------------------------
  {
    category: "pavaros",
    handle: "sg90-servo",
    sku: "ACT-SG90",
    title: "SG90 mikro servo variklis",
    subtitle: "Plastikinių krumpliaračių 9 g servo",
    description:
      "Mažas ir lengvas servo variklis, valdomas PWM signalu. Komplekte svirtelės ir varžteliai. Dažniausias pasirinkimas robotų griebtuvams, kameros pasukimui ir mažoms mechanizmų pavaroms.",
    priceEur: 3.5,
    weightG: 14,
  },
  {
    category: "pavaros",
    handle: "28byj-48-uln2003",
    sku: "ACT-28BYJ48-ULN2003",
    title: "28BYJ-48 žingsninis variklis su ULN2003 valdikliu",
    subtitle: "Variklis ir valdiklio plokštė komplekte",
    description:
      "Mažas unipolinis žingsninis variklis su reduktoriumi ir ULN2003 valdiklio plokšte. Leidžia tiksliai pozicionuoti be grįžtamojo ryšio. Tinka mokomiesiems projektams ir mažoms pavaroms.",
    priceEur: 5.5,
    weightG: 45,
  },
  {
    category: "pavaros",
    handle: "reles-modulis-1-kanalo",
    sku: "ACT-RELAY-1CH",
    title: "Relės modulis, 1 kanalas, su optine izoliacija",
    subtitle: "Didesnių apkrovų komutavimas",
    description:
      "Vieno kanalo relės modulis su optrono izoliacija ir indikaciniu LED. Leidžia mikrovaldikliui įjungti ar išjungti didesnės galios grandines. Komutuojamos apkrovos parametrai nurodyti ant relės.",
    priceEur: 2.5,
    weightG: 18,
  },
  {
    category: "pavaros",
    handle: "ws2812b-juosta-1m",
    sku: "ACT-WS2812B-1M-60",
    title: "WS2812B adresuojama LED juosta, 1 m, 60 LED",
    subtitle: "NeoPixel tipo RGB juosta",
    description:
      "RGB LED juosta su individualiai adresuojamais WS2812B diodais (60 vnt./m), valdoma vienu duomenų laidu. Tinka efektams, indikacijai ir apšvietimui. Palaikoma FastLED ir Adafruit NeoPixel bibliotekų.",
    priceEur: 9.9,
    weightG: 30,
  },

  // --- LED apšvietimas (juostos parduodamos metrais: kiekis = metrai) ------
  {
    category: "led-apsvietimas",
    handle: "ws2811-juosta-12v",
    sku: "LED-WS2811-12V-60",
    title: "WS2811 adresuojama LED juosta 12 V, 60 LED/m (1 m)",
    subtitle: "Kaina už 1 metrą; vienas IC valdo 3 LED",
    description:
      "12 V RGB LED juosta su WS2811 valdikliais: kiekviena 3 LED grupė valdoma atskirai, todėl tinka bėgantiems efektams. Dėl 12 V įtampos tinka ilgesniems ruožams nei 5 V juostos. Valdoma mikrovaldikliu arba adresuojamų juostų valdikliu.",
    priceEur: 4.9,
    weightG: 40,
  },
  {
    category: "led-apsvietimas",
    handle: "cob-juosta-12v",
    sku: "LED-COB-12V-480",
    title: "COB LED juosta 12 V, 480 LED/m, šilta balta (1 m)",
    subtitle: "Kaina už 1 metrą; vientisa šviesos linija be taškų",
    description:
      "Vienos spalvos COB LED juosta su tankiai išdėstytais diodais, todėl šviesa vientisa. Ryškumas reguliuojamas PWM dimeriu. Tinka baldų, lentynų ir nišų apšvietimui.",
    priceEur: 5.9,
    weightG: 30,
  },
  {
    category: "led-apsvietimas",
    handle: "cob-juosta-24v",
    sku: "LED-COB-24V-480",
    title: "COB LED juosta 24 V, 480 LED/m, neutrali balta (1 m)",
    subtitle: "Kaina už 1 metrą; ilgiems ruožams",
    description:
      "Vienos spalvos COB LED juosta 24 V įtampai: dvigubai mažesnė srovė nei 12 V juostos, todėl mažesnis įtampos kritimas ilguose ruožuose. Ryškumas reguliuojamas PWM dimeriu.",
    priceEur: 6.9,
    weightG: 30,
  },
  {
    category: "led-apsvietimas",
    handle: "sp110e-led-valdiklis",
    sku: "LED-CTRL-SP110E",
    title: "SP110E Bluetooth adresuojamų LED juostų valdiklis",
    subtitle: "WS2812B / WS2811 juostoms, valdymas telefono programėle",
    description:
      "Mažas Bluetooth valdiklis adresuojamoms LED juostoms: efektai, spalvos ir ryškumas valdomi telefono programėle, programuoti nereikia. Valdiklis siunčia tik duomenų signalą, juostos maitinimas jungiamas tiesiai iš maitinimo šaltinio.",
    priceEur: 8.9,
    weightG: 20,
  },
  {
    category: "led-apsvietimas",
    handle: "led-dimeris-vienos-spalvos",
    sku: "LED-DIM-1CH-6A",
    title: "Light plan 3007 vienos spalvos LED juostų dimeris 5–36 V, 8 A",
    subtitle: "RF 2.4G imtuvas, tolygus 0–100 % reguliavimas",
    description:
      "Imtuvas-dimeris vienos spalvos LED juostoms, valdomas RF 2.4G nuotolinio valdymo pulteliu (vienos ar kelių zonų; pultelis parduodamas atskirai). 4096 ryškumo lygiai, reguliavimas be mirgėjimo. Juostos srovė teka per dimerį, didžiausia apkrova 8 A: 40 W prie 5 V, 96 W prie 12 V, 192 W prie 24 V, 288 W prie 36 V. Vienos spalvos juostai mikrovaldiklio nereikia.",
    priceEur: 6.5,
    weightG: 25,
  },

  // --- Maitinimas ----------------------------------------------------------
  {
    category: "maitinimas",
    handle: "mb102-breadboard-maitinimas",
    sku: "PWR-MB102",
    title: "MB102 maketavimo plokštės maitinimo modulis",
    subtitle: "Du nepriklausomi maitinimo bėgeliai",
    description:
      "Maitinimo modulis, įstatomas į maketavimo plokštės maitinimo bėgelius. Turi DC lizdą ir USB įėjimą, kiekvienam bėgeliui atskirai parenkama išėjimo įtampa. Patogus prototipams su skirtingų įtampų moduliais.",
    priceEur: 2.9,
    weightG: 12,
  },
  {
    category: "maitinimas",
    handle: "18650-laikiklis-tp4056",
    sku: "PWR-18650-TP4056",
    title: "18650 akumuliatoriaus laikiklis su TP4056 įkrovimo moduliu",
    subtitle: "Nešiojamų projektų maitinimas",
    description:
      "Vieno 18650 Li-ion elemento laikiklis ir TP4056 įkrovimo modulis su apsauga ir USB-C įėjimu. Akumuliatorius į komplektą neįeina.",
    priceEur: 3.9,
    weightG: 15,
  },
  {
    category: "maitinimas",
    handle: "maitinimo-adapteris-9v-1a",
    sku: "PWR-ADAPTER-9V-1A",
    title: "Tinklo adapteris 9 V 1 A (5,5 x 2,1 mm)",
    subtitle: "Arduino Uno DC lizdui",
    description:
      "Stabilizuotas tinklo adapteris su standartiniu 5,5 x 2,1 mm DC kištuku (centras +). Tinka Arduino Uno ir Mega plokščių DC lizdui bei MB102 moduliui.",
    priceEur: 7.9,
    weightG: 90,
  },

  // --- Ryšio moduliai ------------------------------------------------------
  {
    category: "rysio-moduliai",
    handle: "hc-05-bluetooth",
    sku: "COM-HC-05",
    title: "HC-05 Bluetooth modulis (UART)",
    subtitle: "Bluetooth Classic SPP ryšys",
    description:
      "Bluetooth 2.0 modulis su serijine (UART) sąsaja, veikiantis master arba slave režimu. Leidžia belaidžiai valdyti Arduino projektus iš Android telefono ar kompiuterio.",
    priceEur: 6.9,
    weightG: 5,
  },
  {
    category: "rysio-moduliai",
    handle: "nrf24l01-plus",
    sku: "COM-NRF24L01",
    title: "nRF24L01+ 2,4 GHz radijo modulis (SPI)",
    subtitle: "Ryšys tarp kelių mikrovaldiklių",
    description:
      "Mažos galios 2,4 GHz radijo siųstuvas-imtuvas su SPI sąsaja. Tinka duomenims perduoti tarp kelių mikrovaldiklių be Wi-Fi infrastruktūros, pvz., jutiklių tinklui ar nuotoliniam valdymui.",
    priceEur: 3.5,
    weightG: 3,
  },

  // --- Pasyvūs komponentai -------------------------------------------------
  {
    category: "pasyvus-komponentai",
    handle: "rezistoriu-rinkinys-600",
    sku: "PAS-RES-KIT-600",
    title: "Rezistorių rinkinys, 600 vnt., 30 verčių",
    subtitle: "1/4 W metalo plėvelės rezistoriai",
    description:
      "Rezistorių asortimentas nuo 10 omų iki 1 megaomo, po 20 vnt. kiekvienos vertės, surūšiuoti pakeliuose. Būtinas LED, daliklių ir pull-up grandinėms.",
    priceEur: 6.9,
    weightG: 120,
  },
  {
    category: "pasyvus-komponentai",
    handle: "kondensatoriu-rinkinys",
    sku: "PAS-CAP-KIT",
    title: "Kondensatorių rinkinys (keraminiai ir elektrolitiniai)",
    subtitle: "Dažniausios maitinimo filtravimo vertės",
    description:
      "Keraminių ir elektrolitinių kondensatorių asortimentas maitinimo filtravimui ir triukšmų slopinimui prie jutiklių bei servo variklių.",
    priceEur: 7.9,
    weightG: 90,
  },

  // --- Priedai -------------------------------------------------------------
  {
    category: "priedai",
    handle: "breadboard-830",
    sku: "ACC-BB-830",
    title: "Maketavimo plokštė 830 taškų",
    subtitle: "Belitavio prototipavimo pagrindas",
    description:
      "Standartinė belitavio maketavimo plokštė su 830 kontaktų taškų ir dviem maitinimo bėgelių poromis. Tinka visoms šiame kataloge esančioms plokštėms ir moduliams.",
    priceEur: 4.5,
    weightG: 85,
  },
  {
    category: "priedai",
    handle: "jumper-laidai-120",
    sku: "ACC-JUMPER-120",
    title: "Jungiamųjų laidų rinkinys, 120 vnt. (M-M, M-F, F-F)",
    subtitle: "Dupont laidai maketavimui",
    description:
      "Trijų tipų Dupont jungiamieji laidai po 40 vnt.: vyriškas-vyriškas, vyriškas-moteriškas ir moteriškas-moteriškas, 20 cm ilgio. Reikalingi beveik kiekvienam rinkiniui.",
    priceEur: 4.9,
    weightG: 70,
  },
  {
    category: "priedai",
    handle: "micro-usb-kabelis-1m",
    sku: "ACC-USB-MICRO-1M",
    title: "Micro-USB duomenų kabelis, 1 m",
    subtitle: "ESP32 ir Nano programavimui",
    description:
      "USB-A į Micro-USB kabelis su duomenų linijomis (ne tik įkrovimui), tinkamas ESP32 DevKit, Raspberry Pi Pico ir kitų plokščių programavimui bei maitinimui.",
    priceEur: 2.9,
    weightG: 25,
  },
  {
    category: "priedai",
    handle: "lygiu-keitiklis-bss138-4ch",
    sku: "ACC-LLC-BSS138-4",
    title: "Loginių lygių keitiklis, 4 kanalai (BSS138)",
    subtitle: "Dvikryptis I2C ir GPIO lygių derinimas",
    description:
      "Dvikryptis keturių kanalų loginių lygių keitiklis MOSFET pagrindu, skirtas saugiai jungti skirtingų loginių įtampų modulius, pvz., 5 V jutiklį su 3,3 V mikrovaldikliu. Tinka I2C ir lėtiems GPIO signalams.",
    priceEur: 1.9,
    weightG: 2,
  },
  {
    category: "priedai",
    handle: "lygiu-keitiklis-txs0108e-8ch",
    sku: "ACC-LLC-TXS0108E-8",
    title: "Loginių lygių keitiklis, 8 kanalai (TXS0108E)",
    subtitle: "Greitiems SPI ir lygiagretiems signalams",
    description:
      "Aštuonių kanalų dvikryptis lygių keitiklis su TXS0108E lustu ir automatiniu krypties nustatymu. Tinka SPI ekranams ir kitiems greitiems signalams tarp skirtingų įtampų plokščių.",
    priceEur: 2.9,
    weightG: 3,
  },
]

function toOptionsAndVariants(component: ComponentSeed) {
  const option = component.variantOption
  if (!option) {
    return {
      options: [{ title: "Variantas", values: ["Standartinis"] }],
      variants: [
        {
          title: "Standartinis",
          sku: component.sku,
          options: { Variantas: "Standartinis" },
          prices: [{ amount: component.priceEur, currency_code: "eur" }],
        },
      ],
    }
  }
  return {
    options: [{ title: option.title, values: option.variants.map((variant) => variant.value) }],
    variants: option.variants.map((variant) => ({
      title: variant.value,
      sku: variant.sku,
      options: { [option.title]: variant.value },
      prices: [{ amount: variant.priceEur, currency_code: "eur" }],
      metadata: variant.metadata,
    })),
  }
}

type ExistingProductRow = {
  id: string
  handle: string
  options?: Array<{ id: string; title: string; values?: Array<{ id: string; value: string }> | null }> | null
  variants?: Array<{ id: string; sku: string | null }> | null
}

/**
 * Esamos kelių variantų prekės variantus suderina su `component.variantOption`.
 * Grąžina, kiek variantų pašalinta ir sukurta (0/0 – nieko nekeista).
 */
async function syncVariantOption(
  container: MedusaContainer,
  product: ExistingProductRow,
  component: ComponentSeed
): Promise<{ removed: number; created: number }> {
  const desired = component.variantOption!
  const option = product.options?.[0]
  if (!option) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Prekė ${product.handle} neturi parinkties`)
  }

  const desiredSkus = new Set(desired.variants.map((variant) => variant.sku))
  const existingSkus = new Set((product.variants ?? []).map((variant) => variant.sku))
  const obsolete = (product.variants ?? []).filter((variant) => !desiredSkus.has(variant.sku ?? ""))
  const missing = desired.variants.filter((variant) => !existingSkus.has(variant.sku))

  const desiredValues = desired.variants.map((variant) => variant.value)
  const currentValues = (option.values ?? []).map((value) => value.value)
  const optionChanged =
    option.title !== desired.title ||
    desiredValues.length !== currentValues.length ||
    desiredValues.some((value) => !currentValues.includes(value))

  if (!obsolete.length && !missing.length && !optionChanged) {
    return { removed: 0, created: 0 }
  }

  // Seni variantai šalinami pirmiausia, kad būtų galima atsieti jų parinkties reikšmes.
  if (obsolete.length) {
    await deleteProductVariantsWorkflow(container).run({
      input: { ids: obsolete.map((variant) => variant.id) },
    })
  }

  // Reikšmės susietos ir su preke (product_product_option_value), todėl jų
  // negalima tiesiog perrašyti per updateProductOptions: naujos pridedamos, o
  // nebereikalingos atsiejamos nuo prekės per create-and-link workflow.
  const valuesToAdd = desiredValues.filter((value) => !currentValues.includes(value))
  const valueIdsToRemove = (option.values ?? [])
    .filter((value) => !desiredValues.includes(value.value))
    .map((value) => value.id)

  if (valuesToAdd.length || valueIdsToRemove.length) {
    await createAndLinkProductOptionsToProductWorkflow(container).run({
      input: {
        product_id: product.id,
        update: [
          {
            product_option_id: option.id,
            add: valuesToAdd.map((value) => ({ value })),
            remove: valueIdsToRemove,
          },
        ],
      },
    })
  }

  await updateProductOptionsWorkflow(container).run({
    input: {
      selector: { id: option.id },
      update: {
        title: desired.title,
        // Tvarka pagal aprašymą (nuo mažiausios srovės), ne pagal abėcėlę
        ranks: Object.fromEntries(desiredValues.map((value, index) => [value, index])),
      },
    },
  })

  if (missing.length) {
    await createProductVariantsWorkflow(container).run({
      input: {
        product_variants: missing.map((variant) => ({
          product_id: product.id,
          title: variant.value,
          sku: variant.sku,
          options: { [desired.title]: variant.value },
          prices: [{ amount: variant.priceEur, currency_code: "eur" }],
          metadata: variant.metadata,
        })),
      },
    })
  }

  return { removed: obsolete.length, created: missing.length }
}

export default async function seedComponents({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // ---- Būtini duomenys iš initial-data-seed ----------------------------------

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
  })

  const salesChannel = salesChannels[0]
  const shippingProfile = shippingProfiles[0]
  const stockLocation = stockLocations[0]

  if (!salesChannel || !shippingProfile || !stockLocation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Nerastas pardavimo kanalas, shipping profile arba sandėlis. Pirma paleiskite `medusa db:migrate`."
    )
  }

  const categoryIdByHandle = new Map(
    categories.map((category) => [category.handle, category.id as string])
  )

  // Kategorijas pirmą kartą sukuria initial-data-seed (migracija); vėliau
  // pridėtos (pvz., „LED apšvietimas“) sukuriamos čia.
  const missingCategories = COMPONENT_CATEGORIES.filter(
    (category) => !categoryIdByHandle.has(category.handle)
  )
  if (missingCategories.length) {
    const { result: createdCategories } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingCategories.map((category) => ({
          name: category.name,
          handle: category.handle,
          description: category.description,
          is_active: true,
          rank: COMPONENT_CATEGORIES.indexOf(category),
          metadata: { spec_category: category.specCategory },
        })),
      },
    })
    for (const category of createdCategories) {
      categoryIdByHandle.set(category.handle, category.id)
    }
    logger.info(`Sukurtos kategorijos: ${missingCategories.map((c) => c.handle).join(", ")}`)
  }

  // ---- Produktai -------------------------------------------------------------

  const { data: existingData } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "options.id", "options.title", "options.values.id", "options.values.value", "variants.id", "variants.sku"],
  })
  const existingProducts = existingData as unknown as ExistingProductRow[]
  const existingByHandle = new Map(existingProducts.map((product) => [product.handle, product]))

  const toCreate = COMPONENTS.filter((component) => !existingByHandle.has(component.handle))

  logger.info(
    `Komponentų seed: ${COMPONENTS.length} aprašyta, ${toCreate.length} kuriama, ${COMPONENTS.length - toCreate.length} jau yra.`
  )

  for (const component of COMPONENTS.filter((item) => item.variantOption)) {
    const existing = existingByHandle.get(component.handle)
    if (!existing) {
      continue
    }
    const { removed, created: createdVariants } = await syncVariantOption(container, existing, component)
    if (removed || createdVariants) {
      logger.info(
        `${component.handle}: variantai sinchronizuoti (pašalinta ${removed}, sukurta ${createdVariants}).`
      )
    }
  }

  let created = 0

  for (let start = 0; start < toCreate.length; start += BATCH_SIZE) {
    const batch = toCreate.slice(start, start + BATCH_SIZE)

    await createProductsWorkflow(container).run({
      input: {
        products: batch.map((component) => ({
          title: component.title,
          handle: component.handle,
          subtitle: component.subtitle,
          description: component.description,
          status: ProductStatus.PUBLISHED,
          weight: component.weightG,
          shipping_profile_id: shippingProfile.id,
          category_ids: [categoryIdByHandle.get(component.category)!],
          sales_channels: [{ id: salesChannel.id }],
          ...toOptionsAndVariants(component),
        })),
      },
    })

    created += batch.length
    logger.info(`Sukurta ${created}/${toCreate.length} komponentų`)
  }

  // ---- Inventoriaus lygiai -----------------------------------------------------

  // Tik tiems inventoriaus elementams, kurie dar neturi lygio sandėlyje,
  // todėl pakartotinis paleidimas neperrašo rankomis pakoreguotų likučių.
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "location_levels.id"],
  })
  const itemsWithoutLevel = inventoryItems.filter(
    (item) => !item.location_levels?.length
  )

  if (itemsWithoutLevel.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: itemsWithoutLevel.map((item) => ({
          location_id: stockLocation.id,
          inventory_item_id: item.id,
          stocked_quantity: INITIAL_STOCK,
        })),
      },
    })
    logger.info(
      `Sukurti inventoriaus lygiai ${itemsWithoutLevel.length} elementams (${INITIAL_STOCK} vnt.).`
    )
  }

  // ---- Search indeksas -----------------------------------------------------------

  // `product.created` apdorojamas asinchroniškai, o `medusa exec` procesas
  // baigiasi iš karto, todėl indeksavimą pakartojame sinchroniškai. `ingest`
  // daro upsert, tad saugu leisti per visus produktus.
  // Indekso aktyvi versija atsiranda tik pirmą kartą paleidus serverį
  // (`medusa develop`), kuris jį užpildo iš DB. Iki tol ingest praleidžiamas.
  const search = container.resolve(Modules.SEARCH)
  const { data: allProducts } = await query.graph({
    entity: "product",
    fields: ["id"],
  })

  try {
    for (let start = 0; start < allProducts.length; start += INGEST_CHUNK_SIZE) {
      const chunk = allProducts.slice(start, start + INGEST_CHUNK_SIZE)

      await search.ingest({
        name: "product.created",
        data: chunk.map((product) => ({ id: product.id })),
      } as never)
    }

    logger.info(`Search indeksas atnaujintas ${allProducts.length} produktams.`)
  } catch (error) {
    if (
      error instanceof MedusaError &&
      error.type === MedusaError.Types.NOT_FOUND
    ) {
      logger.warn(
        "Search indeksas dar neaktyvuotas: jis bus užpildytas automatiškai paleidus `medusa develop`."
      )
      return
    }
    throw error
  }
}
