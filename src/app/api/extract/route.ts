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

  const formData = await req.formData();
  const file = formData.get("image") as File;
  const platformsRaw = formData.get("platforms") as string;
  const platforms = platformsRaw ? JSON.parse(platformsRaw) : ["ebay", "vinted", "depop"];

  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const imgCheck = validateImage(file, plan);
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
    console.error('[extract] extraction error:', e.message ?? err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}