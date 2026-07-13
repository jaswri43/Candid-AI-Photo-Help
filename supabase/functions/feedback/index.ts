import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js";

const MODEL = "claude-sonnet-4-6";

type StyleProfile = {
  subject_position: string;
  camera_angle: string;
  lighting_tone: string;
  framing_tightness: string;
  background_style: string;
  summary_text: string;
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function extractFeedbackArray(text: string): string[] {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
  const jsonText = jsonMatch ? jsonMatch[0] : trimmed;

  const parsed = JSON.parse(jsonText);

  if (
    !Array.isArray(parsed) ||
    parsed.length === 0 ||
    !parsed.every((item) => typeof item === "string")
  ) {
    throw new Error("Response was not a JSON array of strings");
  }

  return parsed;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
  }

  let body: { imageUrl?: unknown; profileId?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  const { imageUrl, profileId } = body;
  if (typeof imageUrl !== "string" || !isValidHttpUrl(imageUrl)) {
    return jsonResponse(
      { error: "Request body must include a valid 'imageUrl' string." },
      400,
    );
  }
  if (typeof profileId !== "string" || profileId.trim() === "") {
    return jsonResponse(
      { error: "Request body must include a valid 'profileId' string." },
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

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: styleProfile, error: selectError } = await supabase
    .from("style_profiles")
    .select(
      "subject_position, camera_angle, lighting_tone, framing_tightness, background_style, summary_text",
    )
    .eq("profile_id", profileId)
    .maybeSingle<StyleProfile>();

  if (selectError) {
    console.error("Database error fetching style profile:", selectError);
    return jsonResponse({ error: "Failed to look up style profile." }, 500);
  }

  if (!styleProfile) {
    return jsonResponse(
      { error: "No style profile found — generate one first." },
      404,
    );
  }

  const anthropic = new Anthropic({ apiKey });

  const prompt = `You are a photography coach helping someone match a specific aesthetic style.

Style profile to match:
- Subject position: ${styleProfile.subject_position}
- Camera angle: ${styleProfile.camera_angle}
- Lighting tone: ${styleProfile.lighting_tone}
- Framing tightness: ${styleProfile.framing_tightness}
- Background style: ${styleProfile.background_style}
- Overall aesthetic: ${styleProfile.summary_text}

Compare the attached photo to this style profile. Give 2 to 4 specific, actionable pieces of feedback the photographer can act on immediately (e.g. "step back and reframe wider" or "move your subject out of the harsh window light").

Respond with ONLY a JSON array of strings, no markdown formatting, no code fences, no extra commentary. Example: ["Move closer to fill the frame more tightly", "Turn the subject toward the window for softer light"]`;

  let message: Anthropic.Message;
  try {
    message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
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
      { error: "Claude declined to analyze this image." },
      502,
    );
  }

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return jsonResponse({ error: "Claude returned no text response." }, 502);
  }

  let feedback: string[];
  try {
    feedback = extractFeedbackArray(textBlock.text);
  } catch {
    console.error("Failed to parse Claude response as JSON:", textBlock.text);
    return jsonResponse(
      { error: "Failed to parse feedback from Claude's response." },
      502,
    );
  }

  return jsonResponse({ feedback }, 200);
});
