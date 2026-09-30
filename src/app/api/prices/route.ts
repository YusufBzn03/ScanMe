import { priceProvider } from "@/lib/prices";
import { productSchema } from "@/lib/product-schema";

export async function POST(request: Request) {
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Ungültige Produktdaten." }, { status: 400 });
  }

  try {
    const offers = await priceProvider.search(parsed.data);
    return Response.json({ offers });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Preissuche fehlgeschlagen." }, { status: 500 });
  }
}
