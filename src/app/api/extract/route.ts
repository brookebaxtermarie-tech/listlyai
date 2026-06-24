import { NextRequest, NextResponse } from "next/server";
import { extractListing, validateImage } from "@/lib/ai/extractListing";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const plan = profile?.plan ?? "FREE";

  const ALLOWED_PLATFORMS = new Set(["ebay","vinted","depop","poshmark","mercari","leboncoin","wallapop","kleinanzeigen","allegro"]);
  const formData = await req.formData();
  const file = formData.get("image") as File;
  const platformsRaw = formData.get("platforms") as string;
  let parsedPlatforms: unknown;
  try { parsedPlatforms = platformsRaw ? JSON.parse(platformsRaw) : null; } catch { parsedPlatforms = null; }
  const platforms = Array.isArray(parsedPlatforms)
    ? parsedPlatforms.filter((p): p is string => typeof p === "string" && ALLOWED_PLATFORMS.has(p)).slice(0, 9)
    : ["ebay", "vinted", "depop"];
  if (platforms.length === 0) {
    return NextResponse.json({ error: "No valid platforms selected" }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const imgCheck = await validateImage(file, plan);
  if (!imgCheck.valid) {
    return NextResponse.json({ error: imgCheck.reason }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp";

  try {
    const listing = await extractListing(base64, mediaType, platforms, user.id, plan);
    return NextResponse.json(listing);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string; retryAfterSeconds?: number }
    if (e.code === "RATE_LIMITED") {
      return NextResponse.json(
        { error: e.message, retryAfterSeconds: e.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(e.retryAfterSeconds) } }
      );
    }
    if (e.code === "CONTENT_REJECTED") {
      return NextResponse.json(
        { error: "This image couldn't be analysed. Please upload a photo of a clothing item or accessory." },
        { status: 422 }
      );
    }
    console.error('[extract] extraction error:', e.message ?? err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}