import Anthropic from "@anthropic-ai/sdk";
import { recognizeProduct, type ImageMediaType } from "@/lib/recognize";

const ALLOWED: ImageMediaType[] = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("image");

  if (!(file instanceof File)) {
    return Response.json({ error: "Kein Bild übermittelt." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type as ImageMediaType)) {
    return Response.json({ error: "Nur JPEG, PNG, GIF oder WebP erlaubt." }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Bild ist größer als 5 MB." }, { status: 413 });
  }

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const product = await recognizeProduct(base64, file.type as ImageMediaType);
    return Response.json(product);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Zu viele Anfragen, bitte später erneut versuchen." }, { status: 429 });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "API-Key fehlt oder ist ungültig." }, { status: 500 });
    }
    if (error instanceof Anthropic.BadRequestError && /credit balance/i.test(error.message)) {
      return Response.json({ error: "Anthropic-Guthaben aufgebraucht – bitte unter Plans & Billing aufladen." }, { status: 402 });
    }
    console.error(error);
    return Response.json({ error: "Erkennung fehlgeschlagen." }, { status: 500 });
  }
}
