import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer listai_")) {
    return NextResponse.json({ error: "Missing or invalid API key" }, { status: 401 });
  }
  const apiKey = auth.slice(7);
  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  const supabase = createServiceClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, plan")
    .eq("extension_api_key_hash", keyHash)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Gate on live subscription status — a cancelled Pro user must lose access
  // even though their key still exists. Plan is the source of truth (flipped
  // to FREE by the Stripe webhook on subscription.deleted).
  if (profile.plan !== "PRO") {
    return NextResponse.json(
      { error: "Pro subscription required", code: "SUBSCRIPTION_REQUIRED" },
      { status: 403 }
    );
  }

  const { data: listings, error: listingsError } = await supabase
    .from("listings")
    .select("id, title, listing_data, platforms, image_url, status, created_at")
    .eq("user_id", profile.id)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(10);

  if (listingsError) {
    return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 });
  }

  const formatted = (listings ?? []).map(l => {
    const data = l.listing_data as Record<string, unknown> ?? {};
    return {
      id: l.id,
      title: l.title ?? (data.title as string) ?? "",
      price: data.suggested_price_eur ?? null,
      condition: data.condition_grade ?? null,
      tags: (data.tags as string[]) ?? [],
      descriptions: (data.descriptions as Record<string, string>) ?? {},
      image_url: l.image_url ?? null,
      platforms: l.platforms ?? [],
      created_at: l.created_at,
    };
  });

  return NextResponse.json({ listings: formatted });
}
