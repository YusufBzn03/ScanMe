import { mockPriceProvider } from "./mock-provider";
import type { PriceProvider } from "./types";

// Hier später die echte Preisquelle einhängen.
export const priceProvider: PriceProvider = mockPriceProvider;

export type { PriceOffer, PriceProvider } from "./types";
