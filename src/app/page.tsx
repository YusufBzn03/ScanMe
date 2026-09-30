import { Scanner } from "@/components/scanner";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center gap-8 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">ScanMe</h1>
      <p className="text-center text-zinc-600 dark:text-zinc-400">
        Foto eines Produkts hochladen – wir erkennen es für den Preisvergleich.
      </p>
      <Scanner />
    </main>
  );
}
