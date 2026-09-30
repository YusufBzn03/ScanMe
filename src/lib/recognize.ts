import Anthropic from "@anthropic-ai/sdk";
import { PRODUCT_RECOGNITION_PROMPT } from "@/lib/prompts/product-recognition";
import {
  productJsonSchema,
  productSchema,
  type RecognizedProduct,
} from "@/lib/product-schema";

export type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const client = new Anthropic();

export async function recognizeProduct(
  base64: string,
  mediaType: ImageMediaType,
): Promise<RecognizedProduct> {
  const response = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4096,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: productJsonSchema },
    },
    system: PRODUCT_RECOGNITION_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Analysiere dieses Produktbild." },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Die Anfrage wurde abgelehnt.");
  }
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("Keine Antwort vom Modell.");
  return productSchema.parse(JSON.parse(text.text));
}
