import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";

function generateApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `listai_${hex}`;
}

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    // Only check whether a hash exists — never return the plaintext key or hash to the client
    .select("extension_api_key_hash, plan")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    hasKey: profile?.extension_api_key_hash != null,
    plan: profile?.plan ?? "FREE",
  });
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profile?.plan === "FREE") {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  const newKey = generateApiKey();
  const { error } = await supabase
    .from("profiles")
    // Store only the hash. The plaintext key is returned to the user once and never persisted.
    .update({ extension_api_key_hash: hashApiKey(newKey) })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: "Failed to generate key" }, { status: 500 });

  return NextResponse.json({ key: newKey });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase
    .from("profiles")
    .update({ extension_api_key_hash: null })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}

