/**
 * Komponentų techninės specifikacijos, surinktos iš gamintojų datasheet
 * (2026-11-14). Vienintelis duomenų šaltinis ir seed skriptui, ir variklio
 * vienetų testams, todėl testai tikrina realius komponentus.
 *
 * Kiekviena skaitinė vertė turi `source` arba komentarą su dokumentu ir
 * skyriumi. Nepatvirtintos vertės pažymėtos `TODO(datasheet)`.
 *
 * Specifikacija aprašo PARDUODAMĄ MODULĮ, ne lustą: kur modulis turi įtampos
 * reguliatorių ar lygių keitiklius, tai pažymėta.
 */
import type {
  ComponentAttributes,
  InterfaceRequirement,
  McuCapabilities,
  PowerRail,
  SpecCategory,
} from "../modules/compatibility/engine/types"

export interface ComponentSpecData {
  category: SpecCategory
  supplyVoltageMinV: number | null
  supplyVoltageMaxV: number | null
  logicVoltageV: number | null
  inputHighMinV: number | null
  isFiveVoltTolerant: boolean
  currentTypMa: number | null
  currentMaxMa: number | null
  datasheetUrl: string
  /** Dokumento skyriai / lentelės, iš kurių paimtos vertės. */
  datasheetNote: string
  notes?: string
  /** LED juostoms ir valdikliams (žr. ComponentAttributes). */
  attributes?: ComponentAttributes
  interfaces: InterfaceRequirement[]
  powerRails: PowerRail[]
  mcu: McuCapabilities | null
}

/**
 * USB 2.0 prievadas garantuoja 500 mA (USB 2.0 Specification, 7.2.1.2.1
 * „Low-power and High-power Bus-powered Functions“). Naudojama visiems iš USB
 * maitinamiems 5 V bėgeliams, kurių plokštės dokumentacija nenurodo kitaip.
 */
export const USB_PORT_MAX_CURRENT_MA = 500
export const USB_SPEC_SOURCE = "USB 2.0 Specification, 7.2.1.2.1"

const I2C: InterfaceRequirement = { type: "i2c", pinCount: 2 }

export const COMPONENT_SPECS: Record<string, ComponentSpecData> = {
  // --- Mikrovaldikliai -----------------------------------------------------
  "esp32-devkit-v1": {
    category: "mcu_board",
    // Plokštė maitinama per Micro-USB 5 V arba VIN; čipo VDD 3,0–3,6 V duoda
    // plokštės reguliatorius.
    supplyVoltageMinV: 5,
    supplyVoltageMaxV: 5,
    logicVoltageV: 3.3,
    // VIH min = 0,75 × VDD = 2,475 V (ESP32 Series Datasheet v5.3, Table 5-3)
    inputHighMinV: 2.475,
    // Absolute Maximum Ratings: leidžiama įėjimo įtampa max 3,6 V (Table 5-1)
    isFiveVoltTolerant: false,
    currentTypMa: null,
    // Wi-Fi TX 802.11b, +19,5 dBm: 240 mA (Table 5-4)
    currentMaxMa: 240,
    datasheetUrl:
      "https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf",
    datasheetNote:
      "ESP32 Series Datasheet v5.3: Table 5-1 (abs. max 3,6 V), Table 5-3 (VIH 0,75·VDD, IOH 40 mA), Table 5-4 (TX 240 mA), 1.3 Features (34 GPIO, 2 I2C, 3 UART, 4 SPI, 18 ADC kanalų)",
    notes:
      "TODO(datasheet): DevKit V1 plokštė išveda ne visus 34 GPIO (30 kontaktų versija ~25 naudotini) ir 3V3 reguliatoriaus (AMS1117) srovės riba priklauso nuo gamintojo.",
    interfaces: [],
    powerRails: [
      // TODO(datasheet): plokštės reguliatoriaus riba; dažnai AMS1117-3.3 (iki 1 A, bet ribojama šilumos)
      { label: "3V3", voltageV: 3.3, maxCurrentMa: null },
      { label: "5V (USB/VIN)", voltageV: 5, maxCurrentMa: USB_PORT_MAX_CURRENT_MA },
    ],
    mcu: {
      digitalPins: 34,
      // Du 12 bitų SAR ADC, 18 kanalų (Datasheet 4.1.1)
      analogInputs: 18,
      // ADC2 dalijasi su Wi-Fi (ESP-IDF ADC Oneshot „Hardware Limitations“):
      // naudotini lieka ADC1 8 kanalai (GPIO32–39, Table 2-1 pin list)
      analogInputsUsableWithWifi: 8,
      // TODO(datasheet): LED PWM 16 kanalų (Datasheet 4.2.x), patikrinti skyrių
      pwmPins: 16,
      i2cBuses: 2,
      spiBuses: 4,
      uarts: 3,
      hasWifi: true,
      ioVoltageV: 3.3,
      isFiveVoltTolerant: false,
    },
  },

  "arduino-uno-r3": {
    category: "mcu_board",
    // VIN per DC lizdą 7–12 V (Arduino UNO R3 datasheet, 2.2 Power Consumption); USB 5 V
    supplyVoltageMinV: 7,
    supplyVoltageMaxV: 12,
    logicVoltageV: 5,
    // VIH min = 0,6 × VCC = 3,0 V prie 5 V (ATmega328P datasheet 7810D, 28.2 DC Characteristics)
    inputHighMinV: 3.0,
    // Abs. max įtampa ant kontakto VCC + 0,5 V = 5,5 V (28.1)
    isFiveVoltTolerant: true,
    currentTypMa: null,
    currentMaxMa: null,
    datasheetUrl: "https://docs.arduino.cc/resources/datasheets/A000066-datasheet.pdf",
    datasheetNote:
      "Arduino UNO R3 datasheet (2026-11-13): 2.2 Power (VIN 7–12 V), 5 Connector Pinouts (14 D I/O, 6 PWM, 6 analog). ATmega328P 7810D–AVR–01/15: 28.1 Abs. Max (40 mA/pin, VCC+0,5 V), 28.2 DC Characteristics (VIH 0,6·VCC)",
    notes:
      "TODO(datasheet): 3V3 kontakto riba 50 mA ir USB polyfuse 500 mA nurodyti docs.arduino.cc Tech Specs lentelėje, bet ne gautame datasheet PDF.",
    interfaces: [],
    powerRails: [
      { label: "5V (USB)", voltageV: 5, maxCurrentMa: USB_PORT_MAX_CURRENT_MA },
      // TODO(datasheet): 50 mA pagal Arduino Tech Specs, patvirtinti
      { label: "3V3", voltageV: 3.3, maxCurrentMa: 50 },
    ],
    mcu: {
      digitalPins: 14,
      analogInputs: 6,
      analogInputsUsableWithWifi: null,
      pwmPins: 6,
      i2cBuses: 1,
      spiBuses: 1,
      uarts: 1,
      hasWifi: false,
      ioVoltageV: 5,
      isFiveVoltTolerant: true,
    },
  },

  "raspberry-pi-pico": {
    category: "mcu_board",
    // VSYS 1,8–5,5 V (Raspberry Pi Pico Datasheet, 4.3 Pinout/Power)
    supplyVoltageMinV: 1.8,
    supplyVoltageMaxV: 5.5,
    logicVoltageV: 3.3,
    // VIH @ IOVDD = 3,3 V: 2,0 V (RP2040 Datasheet, Table 625)
    inputHighMinV: 2.0,
    // Abs. max VPIN = IOVDD + 0,5 V = 3,8 V (RP2040 Datasheet, Table 622)
    isFiveVoltTolerant: false,
    currentTypMa: null,
    currentMaxMa: null,
    datasheetUrl: "https://datasheets.raspberrypi.com/pico/pico-datasheet.pdf",
    datasheetNote:
      "Pico Datasheet: 1. Features (26 GPIO, 3 ADC, 2 UART, 2 I2C, 2 SPI, 16 PWM), 4.3 Power (VSYS 1,8–5,5 V, 3V3 iki 300 mA). RP2040 Datasheet: Table 622 (VPIN max IOVDD+0,5), Table 625 (VIH 2,0 V @ 3,3 V)",
    interfaces: [],
    powerRails: [
      // „recommended to keep the load on this pin less than 300 mA“ (Pico Datasheet 4.3)
      { label: "3V3", voltageV: 3.3, maxCurrentMa: 300 },
      { label: "VBUS (USB)", voltageV: 5, maxCurrentMa: USB_PORT_MAX_CURRENT_MA },
    ],
    mcu: {
      digitalPins: 26,
      analogInputs: 3,
      analogInputsUsableWithWifi: null,
      pwmPins: 16,
      i2cBuses: 2,
      spiBuses: 2,
      uarts: 2,
      hasWifi: false,
      ioVoltageV: 3.3,
      isFiveVoltTolerant: false,
    },
  },

  "arduino-nano": {
    category: "mcu_board",
    // Tas pats ATmega328P kaip Uno; VIN 7–12 V. TODO(datasheet): Nano datasheet.
    supplyVoltageMinV: 7,
    supplyVoltageMaxV: 12,
    logicVoltageV: 5,
    inputHighMinV: 3.0,
    isFiveVoltTolerant: true,
    currentTypMa: null,
    currentMaxMa: null,
    datasheetUrl:
      "https://ww1.microchip.com/downloads/en/DeviceDoc/Atmel-7810-Automotive-Microcontrollers-ATmega328P_Datasheet.pdf",
    datasheetNote:
      "ATmega328P 7810D–AVR–01/15: 28.1, 28.2. TODO(datasheet): Arduino Nano plokštės datasheet (3V3 iš FT232/CH340 reguliatoriaus)",
    interfaces: [],
    powerRails: [
      { label: "5V (USB)", voltageV: 5, maxCurrentMa: USB_PORT_MAX_CURRENT_MA },
      // TODO(datasheet): Nano 3V3 išvadas maitinamas iš USB-UART lusto reguliatoriaus
      { label: "3V3", voltageV: 3.3, maxCurrentMa: null },
    ],
    mcu: {
      digitalPins: 14,
      analogInputs: 8,
      analogInputsUsableWithWifi: null,
      pwmPins: 6,
      i2cBuses: 1,
      spiBuses: 1,
      uarts: 1,
      hasWifi: false,
      ioVoltageV: 5,
      isFiveVoltTolerant: true,
    },
  },

  // --- Jutikliai -----------------------------------------------------------
  "bme280-modulis-3v3": {
    category: "sensor",
    // VDD 1,71–3,6 V, VDDIO 1,2–3,6 V (BME280 Datasheet BST-BME280-DS002, 1 Specification)
    supplyVoltageMinV: 1.71,
    supplyVoltageMaxV: 3.6,
    logicVoltageV: 3.3,
    inputHighMinV: null,
    // VDDIO max 3,6 V: 5 V SDA/SCL neleidžiama
    isFiveVoltTolerant: false,
    // 3,6 µA @ 1 Hz (visi trys matavimai); IDDP max 714 µA matavimo metu (Table 2–4)
    currentTypMa: 0.0036,
    currentMaxMa: 0.714,
    datasheetUrl:
      "https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme280-ds002.pdf",
    datasheetNote:
      "BST-BME280-DS002: 1 Specification (VDD 1,71–3,6 V, VDDIO 1,2–3,6 V, 3,6 µA), 2 Electrical (IDDP max 714 µA), 6.2 I2C (adresas 0x76 SDO=GND, 0x77 SDO=VDDIO)",
    notes: "3,3 V modulis be reguliatoriaus. Moduliai su LDO ir lygių keitikliais toleruoja 5 V, tai atskira prekė.",
    interfaces: [{ ...I2C, i2cAddresses: [0x76, 0x77], i2cAddressSelectable: true }],
    powerRails: [],
    mcu: null,
  },

  "dht22-am2302": {
    category: "sensor",
    // Power supply DC 3,3–6 V (Aosong AM2302/DHT22 datasheet, 7 Electrical Characteristics)
    supplyVoltageMinV: 3.3,
    supplyVoltageMaxV: 6,
    // Vieno laido išėjimas traukiamas pull-up rezistoriumi iki VDD, todėl lygis = maitinimo įtampa
    logicVoltageV: null,
    inputHighMinV: null,
    isFiveVoltTolerant: true,
    // Measuring 1–1,5 mA (7 Electrical Characteristics)
    currentTypMa: 1,
    currentMaxMa: 1.5,
    datasheetUrl: "https://cdn.sparkfun.com/assets/f/7/d/9/c/DHT22.pdf",
    datasheetNote: "Aosong DHT22 datasheet: 7 Electrical Characteristics (3,3–6 V; 1–1,5 mA measuring; 40–50 µA standby)",
    interfaces: [{ type: "onewire", pinCount: 1 }],
    powerRails: [],
    mcu: null,
  },

  "hc-sr04": {
    category: "sensor",
    // Working Voltage DC 5 V (ElecFreaks HC-SR04 datasheet, Electric Parameter)
    supplyVoltageMinV: 5,
    supplyVoltageMaxV: 5,
    // ECHO: „TTL level signal“ prie 5 V maitinimo = 5 V išėjimas
    logicVoltageV: 5,
    inputHighMinV: null,
    isFiveVoltTolerant: true,
    // Working Current 15 mA
    currentTypMa: 15,
    currentMaxMa: 15,
    datasheetUrl: "https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf",
    datasheetNote: "ElecFreaks HC-SR04: Electric Parameter (DC 5 V, 15 mA, TRIG 10 µs TTL, ECHO TTL)",
    interfaces: [{ type: "digital_io", pinCount: 2 }],
    powerRails: [],
    mcu: null,
  },

  "mpu-6050-gy-521": {
    category: "sensor",
    // VDD 2,375–3,46 V, VLOGIC 1,71 V – VDD (MPU-6000/6050 Product Specification PS-MPU-6000A-00, 6.1)
    supplyVoltageMinV: 2.375,
    supplyVoltageMaxV: 3.46,
    logicVoltageV: 3.3,
    inputHighMinV: null,
    isFiveVoltTolerant: false,
    // Normal operating current, gyro + accel + DMP: 3,9 mA (6.1)
    currentTypMa: 3.9,
    currentMaxMa: 3.9,
    datasheetUrl:
      "https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet1.pdf",
    datasheetNote:
      "PS-MPU-6000A-00: 6.1 Electrical (VDD 2,375–3,46 V; 3,9 mA), 9.2 I2C Interface (b1101000 = 0x68 AD0=0, b1101001 = 0x69 AD0=1)",
    notes:
      "TODO(datasheet): GY-521 plokštė turi 3,3 V LDO, todėl VCC gali būti 5 V, bet SDA/SCL lieka 3,3 V lygio.",
    interfaces: [{ ...I2C, i2cAddresses: [0x68, 0x69], i2cAddressSelectable: true }],
    powerRails: [],
    mcu: null,
  },

  bh1750: {
    category: "sensor",
    // VCC 2,4–3,6 V (ROHM BH1750FVI datasheet Rev.D, Absolute Maximum / Operating Conditions)
    supplyVoltageMinV: 2.4,
    supplyVoltageMaxV: 3.6,
    logicVoltageV: 3.3,
    inputHighMinV: null,
    isFiveVoltTolerant: false,
    // Icc1 120 µA typ, 190 µA max (Electrical Characteristics)
    currentTypMa: 0.12,
    currentMaxMa: 0.19,
    datasheetUrl: "https://www.mouser.com/datasheet/2/348/bh1750fvi-e-186247.pdf",
    datasheetNote:
      "BH1750FVI Rev.D: Operating conditions (VCC 2,4–3,6 V), Electrical Characteristics (Icc 120/190 µA), I2C Slave Address (ADDR=H → 1011100 = 0x5C, ADDR=L → 0100011 = 0x23)",
    notes: "TODO(datasheet): GY-302 modulis turi reguliatorių; čia aprašytas lustas be jo.",
    interfaces: [{ ...I2C, i2cAddresses: [0x23, 0x5c], i2cAddressSelectable: true }],
    powerRails: [],
    mcu: null,
  },

  "pir-hc-sr501": {
    category: "sensor",
    // DC 4,5–20 V (HC-SR501 datasheet, techninių parametrų lentelė)
    supplyVoltageMinV: 4.5,
    supplyVoltageMaxV: 20,
    // Output high 3,3 V / low 0 V (ten pat)
    logicVoltageV: 3.3,
    inputHighMinV: null,
    isFiveVoltTolerant: true,
    // Quiescent current 50 µA (lentelė). „Power Consumption: 65mA“ (savybių sąraše)
    // laikoma konservatyvia viršutine riba; reikšmės prieštaringos – tikrintina.
    currentTypMa: 0.05,
    currentMaxMa: 65,
    datasheetUrl:
      "https://components101.com/sites/default/files/component_datasheet/HC%20SR501%20PIR%20Sensor%20Datasheet.pdf",
    datasheetNote:
      "HC-SR501 datasheet: Voltage range DC 4,5–20 V; Quiescent current 50 µA; high output level 3,3 V / low 0 V; savybėse „Power Consumption: 65mA“ (prieštaringa)",
    notes: "TODO(datasheet): darbinė srovė – datasheet'e prieštaringos vertės (50 µA ramybėje, 65 mA savybėse).",
    interfaces: [{ type: "digital_io", pinCount: 1 }],
    powerRails: [],
    mcu: null,
  },

  "ds18b20-waterproof": {
    category: "sensor",
    // VDD 3,0–5,5 V (DS18B20 datasheet, Features / DC Electrical Characteristics)
    supplyVoltageMinV: 3.0,
    supplyVoltageMaxV: 5.5,
    // Open-drain 1-Wire linija, lygį nustato pull-up (4,7 kΩ) prie MCU įtampos
    logicVoltageV: null,
    inputHighMinV: null,
    isFiveVoltTolerant: true,
    // Active current 1 mA typ, 1,5 mA max
    currentTypMa: 1,
    currentMaxMa: 1.5,
    datasheetUrl:
      "https://www.analog.com/media/en/technical-documentation/data-sheets/DS18B20.pdf",
    datasheetNote: "DS18B20: DC Electrical Characteristics (3,0–5,5 V; IDD 1/1,5 mA; IDDS 750/1000 nA)",
    interfaces: [{ type: "onewire", pinCount: 1 }],
    powerRails: [],
    mcu: null,
  },

  // --- Ekranai -------------------------------------------------------------
  "ssd1306-oled-0-96": {
    category: "display",
    // Lusto logikos VDD 1,65–3,3 V (SSD1306 datasheet, 1 General Description)
    supplyVoltageMinV: 1.65,
    supplyVoltageMaxV: 3.3,
    logicVoltageV: 3.3,
    inputHighMinV: null,
    isFiveVoltTolerant: false,
    currentTypMa: null,
    currentMaxMa: null,
    datasheetUrl: "https://cdn-shop.adafruit.com/datasheets/SSD1306.pdf",
    datasheetNote:
      "SSD1306 Rev 1.1: 1 General Description (VDD 1,65–3,3 V), 8.1.5 MCU I2C Interface (slave 0111100 = 0x3C / 0111101 = 0x3D pagal SA0)",
    notes:
      "TODO(datasheet): dauguma 4 kontaktų 0,96\" modulių turi reguliatorių ir priima 3,3–5 V; adresas keičiamas lydmetalio tilteliu. Patikrinti konkretaus modulio aprašą.",
    interfaces: [{ ...I2C, i2cAddresses: [0x3c, 0x3d], i2cAddressSelectable: false }],
    powerRails: [],
    mcu: null,
  },

  "lcd-1602-i2c": {
    category: "display",
    // HD44780 tipo LCD ir foninis apšvietimas maitinami 5 V; PCF8574 VCC 2,5–6 V
    supplyVoltageMinV: 5,
    supplyVoltageMaxV: 5,
    // Adapterio SDA/SCL pull-up rezistoriai prijungti prie 5 V
    logicVoltageV: 5,
    // PCF8574 VIH min 0,7 × VCC = 3,5 V (TI PCF8574 SCPS068, Recommended Operating Conditions)
    inputHighMinV: 3.5,
    isFiveVoltTolerant: true,
    currentTypMa: null,
    currentMaxMa: null,
    datasheetUrl: "https://www.ti.com/lit/ds/symlink/pcf8574.pdf",
    datasheetNote:
      "TI PCF8574 SCPS068K: Recommended Operating Conditions (VCC 2,5–6 V, VIH 0,7·VCC), adresai 0x20–0x27 (A0–A2). TODO(datasheet): LCD1602 modulio srovė su foniniu apšvietimu",
    interfaces: [
      {
        ...I2C,
        i2cAddresses: [0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27],
        i2cAddressSelectable: true,
      },
    ],
    powerRails: [],
    mcu: null,
  },

  // --- Pavaros ir vykdikliai -----------------------------------------------
  "sg90-servo": {
    category: "actuator",
    // Operating voltage 4,8 V (~5 V) (TowerPro SG90 datasheet, Specifications)
    supplyVoltageMinV: 4.8,
    supplyVoltageMaxV: 5,
    logicVoltageV: null,
    inputHighMinV: null,
    isFiveVoltTolerant: true,
    // TODO(datasheet): stall srovė datasheet nenurodyta (plačiai cituojama ~650 mA), reikia gamintojo šaltinio
    currentTypMa: null,
    currentMaxMa: null,
    datasheetUrl:
      "https://components101.com/sites/default/files/component_datasheet/SG90%20Servo%20Motor%20Datasheet.pdf",
    datasheetNote: "TowerPro SG90 datasheet: Specifications (4,8 V, 1,8 kgf·cm, PWM 1–2 ms). Srovė nenurodyta.",
    interfaces: [{ type: "pwm", pinCount: 1 }],
    powerRails: [],
    mcu: null,
  },

  "28byj-48-uln2003": {
    category: "actuator",
    // Rated voltage 5 VDC (Kiatronics 28BYJ-48 – 5V datasheet)
    supplyVoltageMinV: 5,
    supplyVoltageMaxV: 5,
    logicVoltageV: null,
    // TODO(datasheet): ULN2003A įėjimo slenkstis 3,3 V valdymui (SLRS027, VI(on))
    inputHighMinV: null,
    isFiveVoltTolerant: true,
    // DC varža 50 Ω ±7 % → 5 V / 50 Ω = 100 mA fazei; pilno žingsnio režime
    // dvi fazės kartu: 200 mA typ, 215 mA max (50 Ω − 7 % = 46,5 Ω)
    currentTypMa: 200,
    currentMaxMa: 215,
    datasheetUrl:
      "https://components101.com/sites/default/files/component_datasheet/28byj48-step-motor-datasheet.pdf",
    datasheetNote:
      "Kiatronics 28BYJ-48 – 5V: Rated voltage 5 VDC, DC resistance 50 Ω ±7 %. ULN2003A SLRS027: 500 mA per kanalą",
    interfaces: [{ type: "digital_io", pinCount: 4 }],
    powerRails: [],
    mcu: null,
  },

  "reles-modulis-1-kanalo": {
    category: "actuator",
    // TODO(datasheet): relės modulio (SRD-05VDC-SL-C) ritės srovė ir valdymo įėjimo lygis
    supplyVoltageMinV: 5,
    supplyVoltageMaxV: 5,
    logicVoltageV: null,
    inputHighMinV: null,
    isFiveVoltTolerant: true,
    currentTypMa: null,
    currentMaxMa: null,
    datasheetUrl: "",
    datasheetNote: "TODO(datasheet): Songle SRD-05VDC-SL-C datasheet (ritė 5 V, ~71,4 mA) ir modulio schema",
    interfaces: [{ type: "digital_io", pinCount: 1 }],
    powerRails: [],
    mcu: null,
  },

  "ws2812b-juosta-1m": {
    category: "actuator",
    // Absolute Maximum Ratings: VDD +3,5 – +5,3 V (WS2812B datasheet)
    supplyVoltageMinV: 3.5,
    supplyVoltageMaxV: 5.3,
    logicVoltageV: null,
    // VIH DIN = 0,7 × VDD = 3,5 V prie 5 V maitinimo (Electrical Characteristics)
    inputHighMinV: 3.5,
    isFiveVoltTolerant: true,
    // Vienam metrui (kiekis = metrai): 60 LED/m „Max 11W/meter“ prie 5 V
    // (BTF-LIGHTING WS2812B DC5V prekės aprašymas, „Power“) → 11 W / 5 V = 2 200 mA/m
    currentTypMa: null,
    currentMaxMa: 2200,
    datasheetUrl: "https://cdn-shop.adafruit.com/datasheets/WS2812B.pdf",
    datasheetNote:
      "WS2812B: Absolute Maximum Ratings (VDD 3,5–5,3 V), Electrical Characteristics (VIH 0,7·VDD, VIL 0,3·VDD). Srovė metrui: BTF-LIGHTING „WS2812B ... DC5V“ prekės aprašymas, Power: 60 LED/m maks. 11 W/m (https://www.btf-lighting.com/products/ws2812b-rgb-addressable-led-strip-dc5v)",
    attributes: { ledProtocol: "ws2812b", perMeter: true },
    interfaces: [{ type: "digital_io", pinCount: 1 }],
    powerRails: [],
    mcu: null,
  },

  "ws2811-juosta-12v": {
    category: "actuator",
    // Working Voltage: DC 12V (BTF-LIGHTING 12V WS2811 5050 prekės aprašymas)
    supplyVoltageMinV: 12,
    supplyVoltageMaxV: 12,
    logicVoltageV: null,
    // TODO(datasheet): WS2811 DIN VIH 12 V juostoje (IC maitinamas per rezistorių) – nenustatyta
    inputHighMinV: null,
    isFiveVoltTolerant: true,
    // 60 LED/m „12watt/meter“ prie 12 V → 1 000 mA/m (ten pat, „Power“)
    currentTypMa: null,
    currentMaxMa: 1000,
    datasheetUrl: "https://www.btf-lighting.com/products/12v-ws2811-5050-smd-chasing-led-strip",
    datasheetNote:
      "BTF-LIGHTING 12V WS2811 5050: Working Voltage DC 12V; Power 60 LED/m – 12 W/m; 1 IC valdo 3 LED; 20 IC/m",
    attributes: { ledProtocol: "ws2811", perMeter: true },
    interfaces: [{ type: "digital_io", pinCount: 1 }],
    powerRails: [],
    mcu: null,
  },

  "cob-juosta-12v": {
    category: "actuator",
    // Input Voltage: DC12V (BTF-LIGHTING FCOB 336/480/528 prekės aprašymas)
    supplyVoltageMinV: 12,
    supplyVoltageMaxV: 12,
    logicVoltageV: null,
    inputHighMinV: null,
    isFiveVoltTolerant: true,
    // 480 LED/m, DC 12V – 11 W/m (Wattage) → 11 / 12 = 917 mA/m (apvalinta į viršų)
    currentTypMa: null,
    currentMaxMa: 917,
    datasheetUrl: "https://www.btf-lighting.com/products/fcob-dimmable-led-strip-336-480-528-leds",
    datasheetNote: "BTF-LIGHTING FCOB 336/480/528: Input DC12V; Wattage DC 12V 480 LED/m – 11 W/m",
    attributes: { ledProtocol: "single_color", perMeter: true },
    // Vienos spalvos juosta valdoma PWM dimeriu, ne MCU kontaktu tiesiogiai
    interfaces: [],
    powerRails: [],
    mcu: null,
  },

  "cob-juosta-24v": {
    category: "actuator",
    supplyVoltageMinV: 24,
    supplyVoltageMaxV: 24,
    logicVoltageV: null,
    inputHighMinV: null,
    isFiveVoltTolerant: true,
    // 480 LED/m, DC 24V – 13 W/m (Wattage) → 13 / 24 = 542 mA/m (apvalinta į viršų)
    currentTypMa: null,
    currentMaxMa: 542,
    datasheetUrl: "https://www.btf-lighting.com/products/fcob-dimmable-led-strip-336-480-528-leds",
    datasheetNote: "BTF-LIGHTING FCOB 336/480/528: Input DC24V; Wattage DC 24V 480 LED/m – 13 W/m",
    attributes: { ledProtocol: "single_color", perMeter: true },
    interfaces: [],
    powerRails: [],
    mcu: null,
  },

  // --- LED valdikliai ------------------------------------------------------
  "sp110e-led-valdiklis": {
    category: "led_controller",
    // TODO(datasheet): DC 5–12 V tik iš prekės pavadinimo / adreso (sp110e-...-dc5-12v),
    // specifikacijų lentelė BTF puslapyje pateikta paveikslėliu
    supplyVoltageMinV: 5,
    supplyVoltageMaxV: 12,
    logicVoltageV: null,
    inputHighMinV: null,
    isFiveVoltTolerant: true,
    // TODO(datasheet): valdiklio savoji srovė nenurodyta
    currentTypMa: null,
    currentMaxMa: null,
    datasheetUrl: "https://www.btf-lighting.com/products/sp110e-bluetooth-spi-led-controller-dc5-12v",
    datasheetNote:
      "BTF-LIGHTING SP110E: palaikomi IC pagal pavadinimą WS2812B/WS2811/WS2813/WS2815/SK6812; DC 5–12 V pagal prekės adresą (tikrintina)",
    notes: "TODO(datasheet): įėjimo įtampa ir srovė – iš gamintojo vadovo.",
    // Siunčia tik duomenis: juostos maitinimas jungiamas tiesiai iš maitinimo šaltinio
    attributes: { supportedProtocols: ["ws2812b", "ws2811"], outputCurrentMaxMa: null },
    interfaces: [],
    powerRails: [],
    mcu: null,
  },

  "led-dimeris-vienos-spalvos": {
    category: "led_controller",
    // Light plan 3007 (tiekėjo prekės aprašas, „Charakteristika“): maitinimo įtampa 5–36 V DC
    supplyVoltageMinV: 5,
    supplyVoltageMaxV: 36,
    logicVoltageV: null,
    inputHighMinV: null,
    isFiveVoltTolerant: true,
    // TODO(datasheet): imtuvo savoji srovė nenurodyta
    currentTypMa: null,
    currentMaxMa: null,
    // TODO(datasheet): tiekėjo puslapio / gamintojo datasheet nuoroda. Parametrai sutampa su
    // Skydance V1 (5–36 V, 1 × 8 A, RF 2.4G), bet tapatumas nepatvirtintas.
    datasheetUrl: "",
    datasheetNote:
      "Light plan 3007 (tiekėjo prekės aprašas): maitinimas 5–36 V DC; maks. apkrova 40 W/5 V, 96 W/12 V, 192 W/24 V, 288 W/36 V (= 8 A); lentelėje „Srovė 8,5 A“; RF 2.4G imtuvas, 4096 lygiai",
    notes:
      "TODO(datasheet): nuoroda į šaltinį; srovės riba 8 A (iš W/V), lentelėje 8,5 A – imta mažesnė.",
    // Juostos srovė teka per dimerį. Visos apkrovos eilutės duoda 8 A (40/5 = 96/12 = 192/24 =
    // 288/36), lentelė – 8,5 A; imama mažesnė, konservatyvi riba.
    attributes: { supportedProtocols: ["single_color"], outputCurrentMaxMa: 8000 },
    interfaces: [],
    powerRails: [],
    mcu: null,
  },

  // --- Maitinimas ----------------------------------------------------------
  "mb102-breadboard-maitinimas": {
    category: "power",
    // TODO(datasheet): MB102 įėjimas 6,5–12 V (DC lizdas) arba USB 5 V; išėjimų riba ~700 mA
    supplyVoltageMinV: 6.5,
    supplyVoltageMaxV: 12,
    logicVoltageV: null,
    inputHighMinV: null,
    isFiveVoltTolerant: true,
    currentTypMa: null,
    currentMaxMa: null,
    datasheetUrl: "",
    datasheetNote: "TODO(datasheet): MB102 modulio aprašas (AMS1117-3.3 ir AMS1117-5.0 reguliatoriai)",
    interfaces: [],
    powerRails: [
      { label: "3V3 (MB102)", voltageV: 3.3, maxCurrentMa: null },
      { label: "5V (MB102)", voltageV: 5, maxCurrentMa: null },
    ],
    mcu: null,
  },

  "18650-laikiklis-tp4056": {
    category: "power",
    // Li-ion elementas 3,0–4,2 V; TP4056 įkrovimas iš USB 5 V
    supplyVoltageMinV: 5,
    supplyVoltageMaxV: 5,
    logicVoltageV: null,
    inputHighMinV: null,
    isFiveVoltTolerant: true,
    currentTypMa: null,
    currentMaxMa: null,
    datasheetUrl: "",
    datasheetNote: "TODO(datasheet): TP4056 (NanJing Top Power) ir apsaugos lusto DW01 datasheet; išėjimo srovės riba",
    interfaces: [],
    powerRails: [
      // Nominali Li-ion įtampa; realiai 3,0–4,2 V priklausomai nuo įkrovos
      { label: "BAT (Li-ion 3,7 V)", voltageV: 3.7, maxCurrentMa: null },
    ],
    mcu: null,
  },

  "led-maitinimo-saltinis-5v": ledPowerSupply(5),
  "led-maitinimo-saltinis-12v": ledPowerSupply(12),
  "led-maitinimo-saltinis-24v": ledPowerSupply(24),

  "maitinimo-adapteris-9v-1a": {
    category: "power",
    supplyVoltageMinV: null,
    supplyVoltageMaxV: null,
    logicVoltageV: null,
    inputHighMinV: null,
    isFiveVoltTolerant: true,
    currentTypMa: null,
    currentMaxMa: null,
    datasheetUrl: "",
    datasheetNote: "Prekės specifikacija: 9 V DC, 1 A, 5,5 × 2,1 mm",
    interfaces: [],
    powerRails: [{ label: "9V DC", voltageV: 9, maxCurrentMa: 1000 }],
    mcu: null,
  },

  // --- Ryšio moduliai ------------------------------------------------------
  "hc-05-bluetooth": {
    category: "communication",
    // Breakout plokštė su reguliatoriumi: 4–6 V (components101 HC-05 specifikacija; antrinis šaltinis)
    supplyVoltageMinV: 4,
    supplyVoltageMaxV: 6,
    // Modulio I/O 1,8–3,6 V (HC-05 datasheet, iteadstudio 2010, Features)
    logicVoltageV: 3.3,
    inputHighMinV: null,
    // RX įėjimas 3,3 V, 5 V UART iš Uno be daliklio viršija I/O ribą
    isFiveVoltTolerant: false,
    // TODO(datasheet): 30 mA pagal components101; gamintojo vertė nerasta
    currentTypMa: null,
    currentMaxMa: null,
    datasheetUrl:
      "https://components101.com/sites/default/files/component_datasheet/HC-05%20Datasheet.pdf",
    datasheetNote:
      "HC-05 datasheet (iteadstudio, 2010-06-18): Features (1,8–3,6 V I/O, UART 9600–460800). Breakout 4–6 V: components101.com (antrinis šaltinis, tikrintina)",
    interfaces: [{ type: "uart", pinCount: 2 }],
    powerRails: [],
    mcu: null,
  },

  "nrf24l01-plus": {
    category: "communication",
    // VDD 1,9–3,6 V (nRF24L01+ Product Specification v1.0, Features; Table 12 Supply voltages)
    supplyVoltageMinV: 1.9,
    supplyVoltageMaxV: 3.6,
    logicVoltageV: 3.3,
    inputHighMinV: null,
    // „5V tolerant inputs“ (Features); su įėjimais > 3,6 V VDD turi būti 2,7–3,3 V
    isFiveVoltTolerant: true,
    // 11,3 mA TX @ 0 dBm, 13,5 mA RX @ 2 Mbps (Features)
    currentTypMa: 11.3,
    currentMaxMa: 13.5,
    datasheetUrl:
      "https://cdn.sparkfun.com/assets/3/d/8/5/1/nRF24L01P_Product_Specification_1_0.pdf",
    datasheetNote: "nRF24L01+ PS v1.0: 1 Features (1,9–3,6 V, 5 V tolerant inputs, 11,3/13,5 mA), Table 12 Supply voltages",
    interfaces: [{ type: "spi", pinCount: 5 }],
    powerRails: [],
    mcu: null,
  },

  // --- Pasyvūs komponentai ir priedai: maitinimo nereikia ------------------
  "rezistoriu-rinkinys-600": passive("Rezistorių rinkinys: maitinimas netaikomas"),
  "kondensatoriu-rinkinys": passive("Kondensatorių rinkinys: maitinimas netaikomas"),
  "breadboard-830": accessory("Maketavimo plokštė"),
  "jumper-laidai-120": accessory("Jungiamieji laidai"),
  "micro-usb-kabelis-1m": accessory("USB kabelis"),
  "lygiu-keitiklis-bss138-4ch": {
    ...accessory("Dvikryptis lygių keitiklis BSS138, 4 kanalai"),
    // LV nuo 1,8 V, HV iki 10 V (Adafruit product 757 aprašas); BSS138 VDS 50 V (Fairchild datasheet)
    supplyVoltageMinV: 1.8,
    supplyVoltageMaxV: 10,
    datasheetUrl: "https://cdn-shop.adafruit.com/datasheets/BSS138.pdf",
    datasheetNote: "Adafruit #757: LV ≥ 1,8 V, HV ≤ 10 V, 4 kanalai, I2C tinkamas. Fairchild BSS138: VDSS 50 V, ID 0,22 A",
  },
  "lygiu-keitiklis-txs0108e-8ch": {
    ...accessory("Dvikryptis lygių keitiklis TXS0108E, 8 kanalai"),
    // VCCA 1,4–3,6 V, VCCB 1,65–5,5 V (TI TXS0108E datasheet, Features / Recommended Operating Conditions)
    supplyVoltageMinV: 1.4,
    supplyVoltageMaxV: 5.5,
    datasheetUrl: "https://www.ti.com/lit/ds/symlink/txs0108e.pdf",
    datasheetNote: "TI TXS0108E: Features (1,4–3,6 V A pusė, 1,65–5,5 V B pusė, 110 Mbps push-pull), Recommended Operating Conditions",
  },
}

/**
 * Impulsinis LED maitinimo šaltinis (S-serijos tipo, 110/230 V AC įėjimas).
 * Prekės lygmeniu žinoma tik išėjimo įtampa; srovės riba priklauso nuo
 * varianto (2–10 A) ir saugoma varianto `metadata.rail_max_current_ma`
 * (snapshot.ts ją pritaiko bėgeliui). Įėjimas iš tinklo, todėl
 * `supplyVoltage*` = null: šaltinis bėgelio iš rinkinio nereikalauja.
 */
function ledPowerSupply(voltageV: 5 | 12 | 24): ComponentSpecData {
  return {
    category: "power",
    supplyVoltageMinV: null,
    supplyVoltageMaxV: null,
    logicVoltageV: null,
    inputHighMinV: null,
    isFiveVoltTolerant: true,
    currentTypMa: null,
    currentMaxMa: null,
    datasheetUrl: "",
    datasheetNote: `Išėjimas ${voltageV} V DC pagal prekės ženklinimą; srovė pagal pasirinktą variantą (varianto metadata). TODO(datasheet): konkretaus gamintojo (S-serijos) datasheet, išėjimo įtampos tolerancija ir pulsacijos`,
    notes: "TODO(datasheet): generinis S-serijos klonas, gamintojo dokumentacija nenustatyta.",
    interfaces: [],
    powerRails: [
      // maxCurrentMa = null prekės lygmeniu; perrašoma iš varianto (2–10 A)
      { label: `${voltageV}V DC (PSU)`, voltageV, maxCurrentMa: null },
    ],
    mcu: null,
  }
}

function passive(note: string): ComponentSpecData {
  return {
    category: "passive",
    supplyVoltageMinV: null,
    supplyVoltageMaxV: null,
    logicVoltageV: null,
    inputHighMinV: null,
    isFiveVoltTolerant: true,
    currentTypMa: null,
    currentMaxMa: null,
    datasheetUrl: "",
    datasheetNote: note,
    interfaces: [],
    powerRails: [],
    mcu: null,
  }
}

function accessory(note: string): ComponentSpecData {
  return { ...passive(note), category: "accessory" }
}
