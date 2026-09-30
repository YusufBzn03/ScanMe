import type { RecognizedProduct } from "@/lib/product-schema";
import type { PriceOffer, PriceProvider } from "./types";

const RETAILERS = ["Aldi", "Lidl", "Rewe", "Edeka", "Kaufland", "Netto"];

// Deterministischer Hash, damit dasselbe Produkt immer dieselben Mock-Preise bekommt.
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const mockPriceProvider: PriceProvider = {
  async search(product: RecognizedProduct): Promise<PriceOffer[]> {
    if (!product.product_identified) return [];

    const name = product.product_name ?? product.generic_term ?? "Produkt";
    const seed = hash(`${product.brand ?? ""}|${name}|${product.quantity ?? ""}`);
    const base = 0.6 + (seed % 400) / 100; // 0,60 € – 4,59 €

    const offers = RETAILERS.map((retailer, i): PriceOffer => {
      const factor = 0.85 + (hash(`${seed}:${retailer}`) % 40) / 100; // 0,85 – 1,24
      const exactMatch = i % 3 !== 2;
      const price = Math.round(base * factor * (exactMatch ? 1 : 0.9) * 100) / 100;
      return {
        retailer,
        productName: exactMatch ? name : `${product.generic_term ?? name} (Eigenmarke)`,
        price,
        exactMatch,
      };
    });

    return offers.sort((a, b) => a.price - b.price);
  },
};
