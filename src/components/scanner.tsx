"use client";

import { useEffect, useRef, useState } from "react";
import type { RecognizedProduct } from "@/lib/product-schema";
import type { PriceOffer } from "@/lib/prices";

const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

const TICK_MS = 1200; // Abtastrate der Kamera (lokal, kostenlos)
const SIG_SIZE = 24; // Kantenlänge der Mini-Vorschau für den Bildvergleich
const CHANGED = 14; // mittlere Abweichung (0–255): neues Motiv im Bild
const STABLE = 6; // darunter gilt das Bild als ruhig (nicht verwackelt)
const MAX_WIDTH = 1024;

function meanDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

export function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<RecognizedProduct | null>(null);
  const [offers, setOffers] = useState<PriceOffer[] | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setActive(true);
    } catch {
      stopStream();
      setError("Kamerazugriff nicht möglich. Bitte Berechtigung erteilen (HTTPS oder localhost nötig).");
    }
  }

  function stop() {
    stopStream();
    setActive(false);
    setScanning(false);
  }

  // Kamera beim Verlassen der Seite freigeben.
  useEffect(() => stopStream, []);

  // Laufende Erkennung: Bild nur dann an die API, wenn ein neues, ruhiges Motiv erscheint.
  useEffect(() => {
    if (!active) return;

    const small = document.createElement("canvas");
    small.width = small.height = SIG_SIZE;
    const smallCtx = small.getContext("2d", { willReadFrequently: true });
    let prevSig: Uint8ClampedArray | null = null;
    let scannedSig: Uint8ClampedArray | null = null;
    let busy = false;
    let cancelled = false;

    function signature(video: HTMLVideoElement): Uint8ClampedArray | null {
      if (!smallCtx) return null;
      smallCtx.drawImage(video, 0, 0, SIG_SIZE, SIG_SIZE);
      const { data } = smallCtx.getImageData(0, 0, SIG_SIZE, SIG_SIZE);
      const gray = new Uint8ClampedArray(SIG_SIZE * SIG_SIZE);
      for (let i = 0; i < gray.length; i++) {
        gray[i] = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
      }
      return gray;
    }

    function frameBlob(video: HTMLVideoElement): Promise<Blob | null> {
      const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    }

    async function scan(video: HTMLVideoElement) {
      const blob = await frameBlob(video);
      if (!blob) return;
      const body = new FormData();
      body.append("image", blob, "frame.jpg");

      const res = await fetch("/api/recognize", { method: "POST", body });
      const product = await res.json();
      if (!res.ok) throw new Error(product.error ?? "Fehler");
      if (cancelled) return;

      if (!product.product_identified) {
        setHint("Kein Produkt erkannt – Verpackung näher und ruhig ins Bild halten.");
        return;
      }
      setHint(null);
      setResult(product);
      setOffers(null);

      const priceRes = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      const prices = await priceRes.json();
      if (!priceRes.ok) throw new Error(prices.error ?? "Fehler");
      if (!cancelled) setOffers(prices.offers);
    }

    const timer = setInterval(async () => {
      const video = videoRef.current;
      if (busy || !video || video.readyState < 2 || !video.videoWidth) return;

      const sig = signature(video);
      if (!sig) return;
      const stable = prevSig !== null && meanDiff(sig, prevSig) < STABLE;
      prevSig = sig;
      const isNew = scannedSig === null || meanDiff(sig, scannedSig) > CHANGED;
      if (!stable || !isNew) return;

      busy = true;
      scannedSig = sig;
      setScanning(true);
      setError(null);
      try {
        await scan(video);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      } finally {
        busy = false;
        if (!cancelled) setScanning(false);
      }
    }, TICK_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active]);

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`aspect-[4/3] w-full object-cover ${active ? "" : "hidden"}`}
        />
        {active && (
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            {scanning ? "Erkenne Produkt …" : "Produkt ruhig in die Kamera halten"}
          </span>
        )}
        {!active && (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 p-8 text-center text-zinc-300">
            <p>Kamera starten und Produkte einfach in die Kamera halten.</p>
          </div>
        )}
      </div>

      <button
        onClick={active ? stop : start}
        className="rounded-full bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {active ? "Kamera stoppen" : "Kamera starten"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {hint && <p className="text-sm text-zinc-500">{hint}</p>}

      {result && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">
            {[result.brand, result.product_name].filter(Boolean).join(" ")}
            {result.quantity && <span className="ml-2 text-sm font-normal text-zinc-500">{result.quantity}</span>}
          </h2>
          {!offers && <p className="text-sm text-zinc-500">Preise werden gesucht …</p>}
          {offers && (
            <>
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
                          {o.retailer === result.current_retailer && (
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
            </>
          )}
        </section>
      )}
    </div>
  );
}
