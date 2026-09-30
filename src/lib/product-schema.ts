import { z } from "zod";

export const productSchema = z.object({
  product_identified: z.boolean(),
  brand: z.string().nullable(),
  product_name: z.string().nullable(),
  generic_term: z.string().nullable(),
  quantity: z.string().nullable(),
  ean_code: z.string().nullable(),
  current_retailer: z.string().nullable(),
  search_keywords: z.array(z.string()),
});

export type RecognizedProduct = z.infer<typeof productSchema>;

const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] };

// JSON schema sent to the API (structured outputs); productSchema re-validates the result.
export const productJsonSchema = {
  type: "object",
  properties: {
    product_identified: { type: "boolean" },
    brand: nullableString,
    product_name: nullableString,
    generic_term: nullableString,
    quantity: nullableString,
    ean_code: nullableString,
    current_retailer: nullableString,
    search_keywords: { type: "array", items: { type: "string" } },
  },
  required: [
    "product_identified",
    "brand",
    "product_name",
    "generic_term",
    "quantity",
    "ean_code",
    "current_retailer",
    "search_keywords",
  ],
  additionalProperties: false,
} as const;
