"use client";

import { useState } from "react";
import type { RecognizedProduct } from "@/lib/product-schema";

export function Scanner() {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<RecognizedProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFile(file: File) {
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/recognize", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setResult(data);
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
      {result && (
        <pre className="overflow-x-auto rounded-xl bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
