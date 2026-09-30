import type { RecognizedProduct } from "@/lib/product-schema";

export interface PriceOffer {
  retailer: string;
  productName: string;
  /** Preis in Euro */
  price: number;
  /** true, wenn es exakt das erkannte Produkt ist, false bei einer Alternative */
  exactMatch: boolean;
}

/** Schnittstelle für jede Preisquelle (Mock, später echte API/Scraper). */
export interface PriceProvider {
  search(product: RecognizedProduct): Promise<PriceOffer[]>;
}
