import { model } from "@medusajs/framework/utils"
import KitItem from "./kit-item"

/**
 * Išsaugota rinkinio konfigūracija. `last_validation` laiko paskutinę
 * patikros ataskaitą (ValidationReport), kad rinkinį būtų galima parodyti
 * be pakartotinės patikros; `status` atspindi, ar ji buvo be klaidų.
 */
const Kit = model
  .define("kit", {
    id: model.id({ prefix: "kit" }).primaryKey(),
    name: model.text(),
    // Prisijungusio pirkėjo id; svečiams null. Ryšys per id, ne link, nes
    // rinkinys gali egzistuoti ir be pirkėjo (svečio sesija).
    customer_id: model.text().nullable(),
    status: model.enum(["draft", "validated", "ordered"]).default("draft"),
    last_validation: model.json().nullable(),
    items: model.hasMany(() => KitItem, { mappedBy: "kit" }),
  })
  .cascades({
    delete: ["items"],
  })

export default Kit
