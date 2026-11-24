/**
 * Katalogo produktų handle'ai, kuriuos taisyklės atpažįsta pagal vaidmenį.
 * Vienoje vietoje, kad keičiant katalogą nereikėtų ieškoti po taisykles.
 * Alternatyva ateičiai: `accessory_kind` laukas specifikacijoje.
 */
export const LEVEL_SHIFTER_HANDLE = "lygiu-keitiklis-bss138-4ch"
export const LEVEL_SHIFTER_HANDLES = [LEVEL_SHIFTER_HANDLE, "lygiu-keitiklis-txs0108e-8ch"]

export const EXTERNAL_POWER_HANDLE = "mb102-breadboard-maitinimas"
/** MB102 bėgelių įtampos (component-spec-data.ts, MB102 `powerRails`). */
export const EXTERNAL_POWER_VOLTAGES_V = [3.3, 5]

/** LED maitinimo šaltiniai pagal išėjimo įtampą (R2 siūlo tinkamos įtampos šaltinį). */
export const LED_PSU_BY_VOLTAGE: ReadonlyArray<{ voltageV: number; handle: string }> = [
  { voltageV: 5, handle: "led-maitinimo-saltinis-5v" },
  { voltageV: 12, handle: "led-maitinimo-saltinis-12v" },
  { voltageV: 24, handle: "led-maitinimo-saltinis-24v" },
]

export const BREADBOARD_HANDLE = "breadboard-830"
export const JUMPER_WIRES_HANDLE = "jumper-laidai-120"
export const USB_CABLE_HANDLE = "micro-usb-kabelis-1m"

/** LED valdikliai, siūlomi R9 pasiūlymuose. */
export const LED_PIXEL_CONTROLLER_HANDLE = "sp110e-led-valdiklis"
export const LED_DIMMER_HANDLE = "led-dimeris-vienos-spalvos"

/** Plokštės, programuojamos ir maitinamos per Micro-USB (kabelis reikalingas). */
export const MICRO_USB_BOARD_HANDLES = ["esp32-devkit-v1", "raspberry-pi-pico"]
