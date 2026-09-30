"use client";

import { useState } from "react";
import type { RecognizedProduct } from "@/lib/product-schema";
import type { PriceOffer } from "@/lib/prices";

const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function Scanner() {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<RecognizedProduct | null>(null);
  const [offers, setOffers] = useState<PriceOffer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFile(file: File) {
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setOffers(null);
    setError(null);
    setLoading(true);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/recognize", { method: "POST", body });
      const product = await res.json();
      if (!res.ok) throw new Error(product.error ?? "Fehler");
      setResult(product);

      const priceRes = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      const prices = await priceRes.json();
      if (!priceRes.ok) throw new Error(prices.error ?? "Fehler");
      setOffers(prices.offers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 p-8 text-center hover:border-zinc-500 dark:border-zinc-700">
        <span className="font-medium">Produktfoto auswählen oder aufnehmen</span>
        <span className="text-sm text-zinc-500">JPEG, PNG, GIF oder WebP, max. 5 MB</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Hochgeladenes Produkt" className="max-h-72 rounded-xl object-contain" />
      )}
      {loading && <p className="text-sm text-zinc-500">Produkt wird erkannt …</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {offers && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Preisvergleich</h2>
          <p className="text-xs text-zinc-500">Beispielpreise (Mock-Daten), keine echten Angebote.</p>
          {offers.length === 0 ? (
            <p className="text-sm text-zinc-500">Keine Angebote gefunden.</p>
          ) : (
            <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {offers.map((o, i) => (
                <li key={o.retailer} className="flex items-center justify-between gap-4 p-3">
                  <div>
                    <p className="font-medium">
                      {o.retailer}
                      {o.retailer === result?.current_retailer && (
                        <span className="ml-2 text-xs text-zinc-500">(hier erkannt)</span>
                      )}
                      {i === 0 && (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                          günstigster
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {o.productName}
                      {!o.exactMatch && " · Alternative"}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">{euro.format(o.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {result && (
        <details>
          <summary className="cursor-pointer text-sm text-zinc-500">Erkanntes Produkt (JSON)</summary>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
