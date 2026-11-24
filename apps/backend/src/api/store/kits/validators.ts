import { z } from "@medusajs/framework/zod"

export const KitItemSchema = z.object({
  variant_id: z.string().min(1),
  quantity: z.number().int().min(1).max(100).default(1),
  assigned_rail_label: z.string().min(1).max(64).nullable().optional(),
})

/** Rinkinys ribojamas, kad patikra išliktų greita (NFR: < 300 ms 20 komponentų). */
export const ValidateKitSchema = z.object({
  items: z.array(KitItemSchema).min(1).max(50),
})

export const CreateKitSchema = z.object({
  name: z.string().min(1).max(120),
  items: z.array(KitItemSchema).min(1).max(50),
})

export const AddKitToCartSchema = z.object({
  cart_id: z.string().min(1),
})

export type ValidateKitBody = z.infer<typeof ValidateKitSchema>
export type CreateKitBody = z.infer<typeof CreateKitSchema>
export type AddKitToCartBody = z.infer<typeof AddKitToCartSchema>
