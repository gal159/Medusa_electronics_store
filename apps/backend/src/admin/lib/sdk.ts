import Medusa from "@medusajs/js-sdk"

/**
 * Admin plėtinių klientas. Admin'as aptarnaujamas iš to paties backend'o
 * (/app), todėl baseUrl yra "/" ir naudojama sesijos autentifikacija.
 */
export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: { type: "session" },
})
