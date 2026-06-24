"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function TestPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
    });
  }, [router]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("platforms", JSON.stringify(["ebay", "vinted", "depop"]));

    const res = await fetch("/api/extract", { method: "POST", body: formData });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>ListAI Test</h1>
      <input type="file" accept="image/*" onChange={handleUpload} />
      {loading && <p>Analysing...</p>}
      {result && <pre style={{ marginTop: 20 }}>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}