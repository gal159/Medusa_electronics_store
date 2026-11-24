import {
  configureStoreSearch,
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import {
  CreateComponentSpecSchema,
  ListComponentSpecsQuerySchema,
  UpdateComponentSpecSchema,
} from "./admin/component-specs/validators"
import { AddKitToCartSchema, CreateKitSchema, ValidateKitSchema } from "./store/kits/validators"

/**
 * /admin/* maršrutai autentifikuojami Medusa core (user: session, bearer,
 * api-key), čia tik įvesties validacija.
 *
 * /store/search: storefront'o katalogas (instantsearch) ieško per Search
 * modulio indeksą `product` (src/search/product.ts). Indeksą reikia aiškiai
 * leisti viešai; be šio middleware maršrutas grąžina 404, o storefront'as
 * kartoja užklausą be galo. Produktai automatiškai siaurinami iki publikuotų
 * ir priklausančių užklausos pardavimo kanalui.
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/search",
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
    {
      matcher: "/store/kits/validate",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(ValidateKitSchema)],
    },
    {
      matcher: "/store/kits",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(CreateKitSchema)],
    },
    {
      matcher: "/store/kits/:id/add-to-cart",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(AddKitToCartSchema)],
    },
    {
      matcher: "/admin/compatibility/validate",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(ValidateKitSchema)],
    },
    {
      matcher: "/admin/component-specs",
      methods: ["GET"],
      middlewares: [validateAndTransformQuery(ListComponentSpecsQuerySchema, {})],
    },
    {
      matcher: "/admin/component-specs",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(CreateComponentSpecSchema)],
    },
    {
      matcher: "/admin/component-specs/:id",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(UpdateComponentSpecSchema)],
    },
  ],
})
