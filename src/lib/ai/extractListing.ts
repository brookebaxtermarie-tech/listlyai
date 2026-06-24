// ============================================================
// ListAI — Complete Prompt System + Security Layer
// Model: claude-sonnet-4-6
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ============================================================
// SECTION 1: RATE LIMITING & ABUSE PROTECTION
// ============================================================
// All limits stored in Supabase — no extra infra needed.
// Table: api_usage (user_id, date, extraction_count, token_count)

const LIMITS = {
  FREE: {
    extractionsPerDay: 10,       // 10 listings/day free
    extractionsPerHour: 5,       // burst protection
    maxImageSizeBytes: 5_242_880, // 5MB
    maxTokensPerRequest: 1200,   // pass 1 + pass 2 combined cap
  },
  PRO: {
    extractionsPerDay: 200,
    extractionsPerHour: 30,
    maxImageSizeBytes: 10_485_760, // 10MB
    maxTokensPerRequest: 1500,
  },
} as const;

type Plan = "FREE" | "PRO";

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
  remaining: { day: number; hour: number };
}

export async function checkRateLimit(
  userId: string,
  plan: Plan
): Promise<RateLimitResult> {
  const supabase = await createClient();
  const limits = LIMITS[plan];
  const today = new Date().toISOString().split("T")[0];
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();

  // Daily count
  const { data: dayRow } = await supabase
    .from("api_usage")
    .select("extraction_count")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  const dayCount = dayRow?.extraction_count ?? 0;

  if (dayCount >= limits.extractionsPerDay) {
    return {
      allowed: false,
      reason: `Daily limit of ${limits.extractionsPerDay} listings reached. Resets at midnight.`,
      retryAfterSeconds: secondsUntilMidnight(),
      remaining: { day: 0, hour: 0 },
    };
  }

  // Hourly count (recent rows)
  const { count: hourCount } = await supabase
    .from("api_usage_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", hourAgo);

  if ((hourCount ?? 0) >= limits.extractionsPerHour) {
    return {
      allowed: false,
      reason: `Slow down — max ${limits.extractionsPerHour} listings per hour.`,
      retryAfterSeconds: 3600,
      remaining: { day: limits.extractionsPerDay - dayCount, hour: 0 },
    };
  }

  return {
    allowed: true,
    remaining: {
      day: limits.extractionsPerDay - dayCount,
      hour: limits.extractionsPerHour - (hourCount ?? 0),
    },
  };
}

export async function incrementUsage(userId: string): Promise<void> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Upsert daily counter
  await supabase.rpc("increment_extraction_count", {
    p_user_id: userId,
    p_date: today,
  });

  // Append to log for hourly check
  await supabase.from("api_usage_log").insert({
    user_id: userId,
    created_at: new Date().toISOString(),
  });
}

function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

// ============================================================
// SECTION 2: IMAGE VALIDATION
// ============================================================

interface ImageValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateImage(
  file: File,
  plan: Plan
): ImageValidationResult {
  const limits = LIMITS[plan];

  // Size check
  if (file.size > limits.maxImageSizeBytes) {
    return {
      valid: false,
      reason: `Image too large (${(file.size / 1_048_576).toFixed(1)}MB). Max is ${limits.maxImageSizeBytes / 1_048_576}MB.`,
    };
  }

  // Type check — only real image formats
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return {
      valid: false,
      reason: `Unsupported format. Please upload a JPG, PNG, or WEBP image.`,
    };
  }

  return { valid: true };
}

// ============================================================
// SECTION 3: TAXONOMY ROUTER
// ============================================================
// Runs in Node.js — zero API tokens spent here.

interface TaxonomyBranch {
  garmentTypes: string[];
  disambiguationRules: string[];
  necklines?: string[];
  sleeveTypes?: string[];
  silhouettes?: string[];
  brandPriority: "always" | "if_visible" | "rarely";
}

const TAXONOMY: Record<string, TaxonomyBranch> = {
  "women's_tops": {
    garmentTypes: [
      "tank top", "camisole", "racerback tank", "halter top", "bandeau",
      "tube top", "off-shoulder top", "bardot top", "one-shoulder top",
      "crop top", "peplum top", "bodysuit", "t-shirt", "polo shirt",
      "henley", "blouse", "shirt", "tunic", "wrap top", "corset top",
      "bustier top", "mesh top", "cardigan", "sweatshirt", "hoodie",
    ],
    disambiguationRules: [
      "off-shoulder vs bardot: both sit below both shoulders. Bardot has a STRUCTURED horizontal neckline, often with a fold or elasticized edge. Off-shoulder is softer and less structured.",
      "tank top vs camisole: camisole has THIN SPAGHETTI STRAPS and soft lingerie-like drape, often satin. Tank top has wider straps and sportier construction.",
      "tube top vs bandeau: tube top is more body-hugging and TUBULAR. Bandeau is straighter across the bust with less structure.",
      "peplum top: look for a FLARED RUFFLE or skirt-like panel at the WAIST SEAM.",
      "bodysuit: ONE-PIECE with crotch closure — looks like a very smoothly tucked-in top.",
      "blouse vs shirt: blouse has SOFTER DRAPE, often ruffles or gathers. Shirt is more STRUCTURED with collar and cuffs.",
    ],
    necklines: [
      "crew", "v-neck", "scoop", "boat", "square", "sweetheart",
      "halter", "off-shoulder", "bardot", "one-shoulder", "turtleneck",
      "mock neck", "plunge", "keyhole", "collar",
    ],
    sleeveTypes: [
      "sleeveless", "cap sleeve", "short sleeve", "three-quarter sleeve",
      "long sleeve", "bell sleeve", "balloon sleeve", "puff sleeve",
      "flutter sleeve", "raglan", "batwing", "kimono",
    ],
    silhouettes: ["fitted", "relaxed", "oversized", "cropped", "boxy", "draped", "structured"],
    brandPriority: "if_visible",
  },

  "women's_bottoms": {
    garmentTypes: [
      "mini skirt", "midi skirt", "maxi skirt", "pencil skirt", "a-line skirt",
      "pleated skirt", "wrap skirt", "denim skirt", "straight-leg trousers",
      "wide-leg trousers", "tapered trousers", "cigarette trousers", "cargo pants",
      "tailored shorts", "denim shorts", "bermuda shorts", "skinny jeans",
      "straight jeans", "bootcut jeans", "flare jeans", "wide-leg jeans",
      "mom jeans", "boyfriend jeans", "leggings", "flared leggings",
    ],
    disambiguationRules: [
      "skinny vs straight jeans: skinny is TIGHT THROUGH ENTIRE LEG including ankle. Straight has CONSISTENT WIDTH from thigh to hem.",
      "straight vs tapered: tapered NARROWS TOWARD ANKLE. Straight maintains width.",
      "bootcut vs flare: bootcut has SLIGHT flare from knee. Flare has PRONOUNCED widening below knee.",
      "mom vs boyfriend: mom jeans are HIGH-RISE with relaxed hip/thigh and TAPERED LEG. Boyfriend jeans are LOOSER and STRAIGHTER with a borrowed-fit look.",
    ],
    silhouettes: ["fitted", "relaxed", "wide-leg", "tapered", "straight", "flared", "high-rise", "mid-rise", "low-rise"],
    brandPriority: "if_visible",
  },

  "women's_dresses": {
    garmentTypes: [
      "slip dress", "sundress", "shirt dress", "wrap dress", "bodycon dress",
      "a-line dress", "shift dress", "smock dress", "halter dress",
      "off-shoulder dress", "corset dress", "peplum dress", "t-shirt dress",
      "sweater dress", "knit dress",
    ],
    disambiguationRules: [
      "slip dress vs sundress: slip dress has THIN STRAPS, bias-cut or draped, LINGERIE-INSPIRED. Sundress is lighter and more casual.",
      "shift vs a-line dress: shift is STRAIGHT with minimal waist shaping. A-line is FITTED AT TOP, flares toward hem.",
      "bodycon vs knit dress: bodycon is INTENTIONALLY TIGHT throughout. Knit dress can be relaxed or body-skimming.",
    ],
    silhouettes: ["fitted", "relaxed", "bodycon", "a-line", "straight", "flared", "mini", "midi", "maxi"],
    brandPriority: "if_visible",
  },

  "women's_outerwear": {
    garmentTypes: [
      "denim jacket", "leather jacket", "bomber jacket", "biker jacket",
      "blazer", "trench coat", "puffer jacket", "parka", "wool coat",
      "overcoat", "raincoat", "windbreaker", "gilet",
    ],
    disambiguationRules: [
      "bomber vs harrington: bomber has RIBBED COLLAR, CUFFS, AND HEM. Harrington has a collar, zip front, and PLAID LINING.",
      "trench coat vs overcoat: trench has BELT, STORM FLAP, notched collar. Overcoat is SIMPLER and longer.",
      "puffer vs parka: puffer has QUILTED BAFFLES with visible filled padding. Parka is LONGER and insulated with utility details.",
      "biker vs leather jacket: biker has ASYMMETRICAL ZIP and heavy hardware.",
    ],
    brandPriority: "always",
  },

  "men's_tops": {
    garmentTypes: [
      "crewneck t-shirt", "v-neck t-shirt", "henley", "long-sleeve tee",
      "oxford shirt", "dress shirt", "flannel shirt", "overshirt",
      "polo shirt", "hoodie", "zip hoodie", "crewneck sweatshirt",
      "knit jumper", "cardigan",
    ],
    disambiguationRules: [
      "hoodie vs sweatshirt: hoodie has HOOD and usually a KANGAROO POCKET. Sweatshirt is CREWNECK fleece with no hood.",
      "oxford vs dress shirt: oxford has a more CASUAL TEXTURE WEAVE. Dress shirt is CRISPER and more formal.",
      "henley vs polo: henley has a PLACKET WITHOUT A COLLAR. Polo has a COLLAR.",
    ],
    brandPriority: "always",
  },

  "men's_bottoms": {
    garmentTypes: [
      "slim jeans", "straight jeans", "relaxed jeans", "tapered trousers",
      "chinos", "cargo pants", "track pants", "sweatpants",
      "denim shorts", "tailored shorts",
    ],
    disambiguationRules: [
      "slim vs straight: slim is FITTED through thigh and leg. Straight has CONSISTENT WIDTH.",
      "chinos vs trousers: chinos are COTTON TWILL with clean front. Trousers are more FORMAL.",
    ],
    brandPriority: "always",
  },

  "men's_outerwear": {
    garmentTypes: [
      "bomber jacket", "denim jacket", "leather jacket", "puffer jacket",
      "trench coat", "overcoat", "rain jacket", "harrington jacket",
      "field jacket", "blazer", "gilet", "windbreaker",
    ],
    disambiguationRules: [
      "bomber vs harrington: bomber has RIBBED COLLAR/CUFFS/HEM. Harrington has COLLAR, ZIP, TARTAN LINING.",
      "field vs cargo jacket: field has CHEST AND SIDE POCKETS with military styling. Cargo has CARGO POCKETS on lower body.",
      "windbreaker vs rain jacket: windbreaker is LIGHTWEIGHT NYLON SHELL. Rain jacket has WATERPROOF MEMBRANE.",
    ],
    brandPriority: "always",
  },

  "sneakers": {
    garmentTypes: [
      "low-top sneakers", "high-top sneakers", "platform sneakers",
      "running shoes", "basketball shoes", "skate shoes", "trail runners",
    ],
    disambiguationRules: [
      "high-top vs low-top: high-top EXTENDS ABOVE THE ANKLE BONE. Low-top sits below it.",
      "platform: VISIBLY THICK SOLE regardless of upper height.",
      "running vs lifestyle: running shoes have CURVED SOLE, BREATHABLE UPPER, technical look. Lifestyle sneakers are CLEANER and less technical.",
    ],
    brandPriority: "always",
  },

  "boots": {
    garmentTypes: [
      "ankle boots", "chelsea boots", "knee-high boots", "combat boots",
      "work boots", "heeled boots", "cowboy boots",
    ],
    disambiguationRules: [
      "chelsea boots: ELASTIC SIDE GUSSETS, ankle height, clean silhouette.",
      "ankle vs chelsea: ankle boots have LACES, ZIPS OR BUCKLES. Chelsea boots have ELASTIC PANELS only.",
    ],
    brandPriority: "always",
  },

  "bags": {
    garmentTypes: [
      "tote bag", "shoulder bag", "crossbody bag", "clutch",
      "backpack", "bucket bag", "saddle bag", "hobo bag", "mini bag",
    ],
    disambiguationRules: [
      "shoulder vs crossbody: shoulder bag HANGS FROM SHOULDER. Crossbody has LONGER STRAP that crosses the body.",
      "bucket bag: CYLINDRICAL with drawstring or open top.",
      "saddle bag: CURVED FLAP, D-ring detail, distinctive curved bottom.",
    ],
    brandPriority: "always",
  },
};

export function getTaxonomyBranch(
  gender: string,
  category: string
): TaxonomyBranch | null {
  const key = `${gender.toLowerCase()}_${category.toLowerCase().replace(/[\s']/g, "_").replace(/__/g, "_")}`;
  // Try exact match first, then category-only match
  return TAXONOMY[key] ?? TAXONOMY[category.toLowerCase()] ?? null;
}

function buildTaxonomyBlock(branch: TaxonomyBranch): string {
  const lines: string[] = [];

  lines.push(`GARMENT TYPES — pick exactly one:\n${branch.garmentTypes.join(" | ")}`);
  lines.push(`\nDISAMBIGUATION RULES — use these to distinguish similar items:`);
  branch.disambiguationRules.forEach((r) => lines.push(`- ${r}`));

  if (branch.necklines)
    lines.push(`\nNECKLINE — pick exactly one: ${branch.necklines.join(" | ")}`);
  if (branch.sleeveTypes)
    lines.push(`SLEEVE TYPE — pick exactly one: ${branch.sleeveTypes.join(" | ")}`);
  if (branch.silhouettes)
    lines.push(`SILHOUETTE — pick 1-2: ${branch.silhouettes.join(" | ")}`);

  lines.push(`\nBRAND IN TITLE RULE: ${
    branch.brandPriority === "always"
      ? "ALWAYS include brand at the START of the title if detected."
      : branch.brandPriority === "if_visible"
      ? "Include brand in title ONLY if clearly visible (logo, label, tag)."
      : "OMIT brand from title unless it is a well-known streetwear or luxury label."
  }`);

  return lines.join("\n");
}

// ============================================================
// SECTION 4: PASS 1 — COARSE CLASSIFICATION
// ============================================================

const PASS_1_SYSTEM = `You are a fashion item classifier for a secondhand resale app.
Your only job is to identify the gender context and major category of the item in the photo.
Return ONLY valid JSON. No markdown, no explanation, no preamble.`;

const PASS_1_PROMPT = `Classify this item. Return ONLY valid JSON:
{
  "gender": "Women's | Men's | Unisex | Kids'",
  "category": "Tops | Bottoms | Dresses | Outerwear | Sneakers | Boots | Heels | Flats | Sandals | Bags | Belts | Hats | Jewellery | Other",
  "photo_quality": "good | needs_second_photo | needs_retake",
  "photo_issue": "null or one plain-language description of the issue",
  "photo_fix": "null or one plain-language instruction for the user",
  "confidence": 0.0
}

Photo quality rules:
- needs_retake: image is too dark, blurred, heavily distorted, cluttered background, or multiple items
- needs_second_photo: main image is clear but a label, sole, back, or flaw close-up would improve accuracy
- good: image is clear, item is well-lit and fills the frame`;

// ============================================================
// SECTION 5: PASS 2 — PRECISE EXTRACTION
// ============================================================

function buildPass2Prompt(
  taxonomyBlock: string,
  platforms: string[]
): string {
  const descriptionFields = platforms
    .map((p) => {
      const rules: Record<string, string> = {
        ebay: "spec-driven, keyword-first, 3-4 sentences: brand + model + condition + measurements + flaws. No personality. Max 80 char title.",
        vinted: "honest and conversational, 2-3 sentences: condition + fit + any flaws. Simple language. Max ~50 char title.",
        depop: "editorial and trend-aware, 1-2 sentences + aesthetic framing. Reference era, vibe, style. End with 3-5 hashtags. Max ~50 char title.",
        poshmark: "friendly and descriptive, 2-3 sentences: brand + item + condition + fit notes. Mention bundle discounts. Max ~60 char title.",
        leboncoin: "practical French, 2-3 sentences: item + condition + size + measurements available. Max ~60 char title.",
        wallapop: "warm Spanish, 2-3 sentences: what it is + condition + size + inspection-friendly detail. Max ~60 char title.",
        kleinanzeigen: "direct German, 2-3 sentences: exact spec, condition, size. No vague hype. Max ~60 char title.",
        allegro: "Polish keyword string: product type + brand + size + colour + material + condition. Max ~75 char title.",
      };
      return `"${p}": "${rules[p] ?? "clear and concise description in the platform's local language"}"`;
    })
    .join(",\n    ");

  return `You are an AI listing assistant for secondhand resellers.
Analyze this photo carefully using the taxonomy and rules below.

${taxonomyBlock}

CONDITION SUB-SIGNALS — detect each independently before assigning a grade:
- Fabric wear: pilling, thinning, fraying
- Colour wear: fading, discoloration, yellowing (especially underarms, collar)
- Structural wear: shape collapse, stretched cuffs, collar fatigue
- Hardware wear: zipper condition, button integrity
- Stains: visible marks, discoloration patches
- Tears / holes: pinholes, seam separation, fabric damage
Then assign condition_grade based on these signals:
- "New with tags": unworn, tags attached
- "Like new": unworn or worn once, no visible wear
- "Very good": light, localized wear only
- "Good": obvious but moderate wear
- "Fair": clear usable wear, flaws present
- "Poor": major flaws, tears, broken closures

BRAND DETECTION — three levels only:
1. confirmed: clear logo, neck label, heel tab, monogram, or engraved hardware visible
2. likely: recognizable silhouette, stitching, hardware shape, sole shape — but no direct logo
3. unknown: folded, blurred, logo-free, or no visible evidence

Return ONLY valid JSON, no markdown, no explanation:
{
  "garment_type": "exact type from taxonomy list",
  "neckline": "from neckline list or null",
  "sleeve_type": "from sleeve list or null",
  "silhouette": ["up to 2 from silhouette list"],
  "brand": "brand name or null",
  "brand_confidence": "confirmed | likely | unknown",
  "brand_source": "chest_logo | neck_label | heel_tab | hardware | signature_pattern | null",
  "color_primary": "dominant colour",
  "color_secondary": "secondary colour or null",
  "pattern": "solid | striped | floral | plaid | graphic | monogram | logo | tie-dye | animal | geometric | other",
  "size": "tag size if visible or null",
  "material_apparent": "apparent material or null",
  "condition_signals": ["array of visible defect descriptions"],
  "condition_grade": "New with tags | Like new | Very good | Good | Fair | Poor",
  "condition_confidence": "high | medium | low",
  "condition_needs_review": false,
  "title": "listing title max 60 chars — apply brand-in-title rule",
  "suggested_price_eur": 0,
  "tags": ["5-8 lowercase search tags"],
  "descriptions": {
    ${descriptionFields}
  },
  "overall_confidence": 0.0
}`;
}

// ============================================================
// SECTION 6: MAIN EXTRACTION FUNCTION
// ============================================================

export interface ListingData {
  // Classification
  gender: string;
  category: string;
  garment_type: string;
  neckline: string | null;
  sleeve_type: string | null;
  silhouette: string[];
  // Item details
  brand: string | null;
  brand_confidence: "confirmed" | "likely" | "unknown";
  brand_source: string | null;
  color_primary: string;
  color_secondary: string | null;
  pattern: string;
  size: string | null;
  material_apparent: string | null;
  // Condition
  condition_signals: string[];
  condition_grade: string;
  condition_confidence: "high" | "medium" | "low";
  condition_needs_review: boolean;
  // Listing output
  title: string;
  suggested_price_eur: number;
  tags: string[];
  descriptions: Record<string, string>;
  // Photo quality
  photo_quality: "good" | "needs_second_photo" | "needs_retake";
  photo_issue: string | null;
  photo_fix: string | null;
  // Meta
  overall_confidence: number;
}

export async function extractListing(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  platforms: string[] = ["ebay", "vinted", "depop", "poshmark"],
  userId: string,
  plan: Plan = "FREE"
): Promise<ListingData> {
  // ── Security: rate limit check ─────────────────────────────
  const rateCheck = await checkRateLimit(userId, plan);
  if (!rateCheck.allowed) {
    throw Object.assign(new Error(rateCheck.reason), {
      code: "RATE_LIMITED",
      retryAfterSeconds: rateCheck.retryAfterSeconds,
    });
  }

  const imageContent = {
    type: "image" as const,
    source: { type: "base64" as const, media_type: mediaType, data: imageBase64 },
  };

  // ── Pass 1: coarse classification ─────────────────────────
  const pass1 = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300, // hard cap — pass 1 only needs ~80 tokens
    system: PASS_1_SYSTEM,
    messages: [{ role: "user", content: [imageContent, { type: "text", text: PASS_1_PROMPT }] }],
  });

  const pass1Text = (pass1.content[0] as { type: "text"; text: string }).text.trim();
  const pass1Data = JSON.parse(pass1Text.replace(/^```json\s*/i, "").replace(/```\s*$/, ""));

  const { gender, category, photo_quality, photo_issue, photo_fix } = pass1Data;

  // ── Photo quality gate: hard stop on unusable images ──────
  if (photo_quality === "needs_retake") {
    // Increment usage even on retake (we still made an API call)
    await incrementUsage(userId);
    return {
      gender, category,
      garment_type: "", neckline: null, sleeve_type: null, silhouette: [],
      brand: null, brand_confidence: "unknown", brand_source: null,
      color_primary: "", color_secondary: null, pattern: "solid",
      size: null, material_apparent: null,
      condition_signals: [], condition_grade: "Good",
      condition_confidence: "low", condition_needs_review: true,
      title: "", suggested_price_eur: 0, tags: [], descriptions: {},
      photo_quality, photo_issue, photo_fix,
      overall_confidence: 0,
    };
  }

  // ── Taxonomy router: select the right branch ──────────────
  const branch = getTaxonomyBranch(gender, category);
  const taxonomyBlock = branch
    ? buildTaxonomyBlock(branch)
    : `Describe this ${gender} ${category} item as specifically as possible.`;

  // ── Pass 2: precise extraction ────────────────────────────
  const pass2Prompt = buildPass2Prompt(taxonomyBlock, platforms);

  const pass2 = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200, // hard cap — full JSON output
    system: "You are an AI listing assistant. Return only valid JSON. No markdown. No explanation.",
    messages: [{ role: "user", content: [imageContent, { type: "text", text: pass2Prompt }] }],
  });

  const pass2Text = (pass2.content[0] as { type: "text"; text: string }).text.trim();
  const pass2Data = JSON.parse(pass2Text.replace(/^```json\s*/i, "").replace(/```\s*$/, ""));

  // ── Increment usage only after both passes succeed ────────
  await incrementUsage(userId);

  return {
    gender,
    category,
    photo_quality,
    photo_issue: photo_issue === "null" ? null : photo_issue,
    photo_fix: photo_fix === "null" ? null : photo_fix,
    ...pass2Data,
  };
}

// ============================================================
// SECTION 7: API ROUTE (Next.js App Router)
// ============================================================
// src/app/api/extract/route.ts
//
// import { NextRequest, NextResponse } from "next/server";
// import { extractListing, validateImage } from "@/lib/ai/extractListing";
// import { createClient } from "@/lib/supabase/server";
//
// export async function POST(req: NextRequest) {
//   // ── Auth check ─────────────────────────────────────────
//   const supabase = createClient();
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }
//
//   // ── Get user plan ──────────────────────────────────────
//   const { data: profile } = await supabase
//     .from("profiles")
//     .select("plan")
//     .eq("id", user.id)
//     .single();
//   const plan = profile?.plan ?? "FREE";
//
//   // ── Parse form data ────────────────────────────────────
//   const formData = await req.formData();
//   const file = formData.get("image") as File;
//   const platformsRaw = formData.get("platforms") as string;
//   const platforms = platformsRaw ? JSON.parse(platformsRaw) : ["ebay", "vinted", "depop"];
//
//   if (!file) {
//     return NextResponse.json({ error: "No image provided" }, { status: 400 });
//   }
//
//   // ── Image validation ───────────────────────────────────
//   const imgCheck = validateImage(file, plan);
//   if (!imgCheck.valid) {
//     return NextResponse.json({ error: imgCheck.reason }, { status: 400 });
//   }
//
//   // ── Convert to base64 ──────────────────────────────────
//   const buffer = await file.arrayBuffer();
//   const base64 = Buffer.from(buffer).toString("base64");
//   const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp";
//
//   // ── Run extraction ─────────────────────────────────────
//   try {
//     const listing = await extractListing(base64, mediaType, platforms, user.id, plan);
//     return NextResponse.json(listing);
//   } catch (err: any) {
//     if (err.code === "RATE_LIMITED") {
//       return NextResponse.json(
//         { error: err.message, retryAfterSeconds: err.retryAfterSeconds },
//         { status: 429, headers: { "Retry-After": String(err.retryAfterSeconds) } }
//       );
//     }
//     console.error("Extraction error:", err);
//     return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
//   }
// }

// ============================================================
// SECTION 8: SUPABASE MIGRATIONS
// ============================================================
/*
-- Run these in your Supabase SQL editor

-- Daily usage counter (upserted each day)
CREATE TABLE IF NOT EXISTS api_usage (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        date NOT NULL,
  extraction_count integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Per-request log (used for hourly rate limiting)
CREATE TABLE IF NOT EXISTS api_usage_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast hourly queries
CREATE INDEX IF NOT EXISTS idx_usage_log_user_time
  ON api_usage_log(user_id, created_at DESC);

-- Auto-cleanup: delete log rows older than 25 hours (keeps table lean)
-- Set up as a Supabase cron job (pg_cron):
-- SELECT cron.schedule('cleanup-usage-log', '0 * * * *',
--   'DELETE FROM api_usage_log WHERE created_at < now() - interval ''25 hours''');

-- RPC function for atomic daily counter increment
CREATE OR REPLACE FUNCTION increment_extraction_count(
  p_user_id uuid,
  p_date date
) RETURNS void AS $$
BEGIN
  INSERT INTO api_usage(user_id, date, extraction_count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET extraction_count = api_usage.extraction_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: users can only see their own rows
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_usage" ON api_usage
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_log" ON api_usage_log
  FOR ALL USING (auth.uid() = user_id);
*/