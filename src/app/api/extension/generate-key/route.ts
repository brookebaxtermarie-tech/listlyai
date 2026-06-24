import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function generateApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `listai_${hex}`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("extension_api_key, plan")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    key: profile?.extension_api_key ?? null,
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
    .update({ extension_api_key: newKey })
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
    .update({ extension_api_key: null })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
