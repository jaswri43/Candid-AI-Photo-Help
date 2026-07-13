import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js";

const MODEL = "claude-sonnet-4-6";
const MIN_IMAGES = 3;
const MAX_IMAGES = 10;

const STYLE_FIELDS = [
  "subject_position",
  "camera_angle",
  "lighting_tone",
  "framing_tightness",
  "background_style",
  "summary_text",
] as const;

type StyleFields = Record<(typeof STYLE_FIELDS)[number], string>;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function extractStyleFields(text: string): StyleFields {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : trimmed;

  const parsed = JSON.parse(jsonText);

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Response was not a JSON object");
  }

  for (const field of STYLE_FIELDS) {
    if (typeof parsed[field] !== "string" || parsed[field].trim() === "") {
      throw new Error(`Response is missing required field: ${field}`);
    }
  }

  return parsed as StyleFields;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
  }

  let body: { profileId?: unknown; imageUrls?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  const { profileId, imageUrls } = body;

  if (typeof profileId !== "string" || profileId.trim() === "") {
    return jsonResponse(
      { error: "Request body must include a valid 'profileId' string." },
      400,
    );
  }

  if (
    !Array.isArray(imageUrls) ||
    imageUrls.length < MIN_IMAGES ||
    imageUrls.length > MAX_IMAGES ||
    !imageUrls.every(isValidHttpUrl)
  ) {
    return jsonResponse(
      {
        error: `Request body must include 'imageUrls' as an array of ${MIN_IMAGES}-${MAX_IMAGES} valid URLs.`,
      },
      400,
    );
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!apiKey || !supabaseUrl || !supabaseServiceRoleKey) {
    console.error(
      "Missing required environment variables (ANTHROPIC_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
    return jsonResponse({ error: "Server is not configured correctly." }, 500);
  }

  const anthropic = new Anthropic({ apiKey });
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const prompt = `You are a photography coach analyzing a set of reference photos to build a structured style profile.

These ${imageUrls.length} photos represent the aesthetic a photographer wants to consistently match. Analyze them as a set (not individually) and extract the common style attributes.

Respond with ONLY a JSON object, no markdown formatting, no code fences, no extra commentary, matching exactly this shape:
{
  "subject_position": "short description of where the subject tends to sit in the frame",
  "camera_angle": "short description of the typical camera angle/height",
  "lighting_tone": "short description of the typical lighting quality and mood",
  "framing_tightness": "short description of how tight or loose the framing tends to be",
  "background_style": "short description of the typical background treatment",
  "summary_text": "a 1-2 sentence human-readable summary of the overall aesthetic"
}`;

  let message: Anthropic.Message;
  try {
    message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            ...imageUrls.map((url) => ({
              type: "image" as const,
              source: { type: "url" as const, url },
            })),
            { type: "text", text: prompt },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error("Claude API error:", error.status, error.message);
      return jsonResponse(
        { error: `Claude API request failed: ${error.message}` },
        502,
      );
    }
    console.error("Unexpected error calling Claude API:", error);
    return jsonResponse({ error: "Failed to reach the Claude API." }, 502);
  }

  if (message.stop_reason === "refusal") {
    return jsonResponse(
      { error: "Claude declined to analyze these images." },
      502,
    );
  }

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return jsonResponse({ error: "Claude returned no text response." }, 502);
  }

  let styleFields: StyleFields;
  try {
    styleFields = extractStyleFields(textBlock.text);
  } catch (error) {
    console.error("Failed to parse Claude response as JSON:", textBlock.text, error);
    return jsonResponse(
      { error: "Failed to parse style profile from Claude's response." },
      502,
    );
  }

  const { data: existing, error: selectError } = await supabase
    .from("style_profiles")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (selectError) {
    console.error("Database error looking up existing style profile:", selectError);
    return jsonResponse({ error: "Failed to look up existing style profile." }, 500);
  }

  const row = existing
    ? await supabase
        .from("style_profiles")
        .update({ ...styleFields, generated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single()
    : await supabase
        .from("style_profiles")
        .insert({ profile_id: profileId, ...styleFields })
        .select()
        .single();

  if (row.error) {
    console.error("Database error saving style profile:", row.error);
    return jsonResponse({ error: "Failed to save style profile." }, 500);
  }

  return jsonResponse({ styleProfile: row.data }, 200);
});
