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

type RatedPhoto = {
  id: string;
  image_url: string;
  rating: number;
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

type FeedbackResult = {
  feedback: string[];
  score: number;
};

function extractFeedbackResult(text: string): FeedbackResult {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : trimmed;

  const parsed = JSON.parse(jsonText);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray(parsed.feedback) ||
    parsed.feedback.length === 0 ||
    !parsed.feedback.every((item: unknown) => typeof item === "string") ||
    typeof parsed.score !== "number" ||
    !Number.isInteger(parsed.score) ||
    parsed.score < 0 ||
    parsed.score > 100
  ) {
    throw new Error(
      "Response was not a JSON object of the form { feedback: string[], score: number }",
    );
  }

  return { feedback: parsed.feedback, score: parsed.score };
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

  let fewShotExamples: RatedPhoto[] = [];
  try {
    const [{ data: topRated, error: topError }, { data: bottomRated, error: bottomError }] =
      await Promise.all([
        supabase
          .from("rated_photos")
          .select("id, image_url, rating")
          .eq("profile_id", profileId)
          .order("rating", { ascending: false })
          .limit(3),
        supabase
          .from("rated_photos")
          .select("id, image_url, rating")
          .eq("profile_id", profileId)
          .order("rating", { ascending: true })
          .limit(3),
      ]);

    if (topError) throw topError;
    if (bottomError) throw bottomError;

    const seenIds = new Set<string>();
    for (const photo of (topRated ?? []) as RatedPhoto[]) {
      seenIds.add(photo.id);
    }
    const bottomOnly = ((bottomRated ?? []) as RatedPhoto[]).filter(
      (photo) => !seenIds.has(photo.id),
    );

    const combined = [...((topRated ?? []) as RatedPhoto[]), ...bottomOnly];
    if (combined.length >= 2) {
      fewShotExamples = combined;
    }
  } catch (error) {
    console.error("Failed to fetch rated photos for few-shot examples:", error);
    fewShotExamples = [];
  }

  const anthropic = new Anthropic({ apiKey });

  const styleProfileText = `Style profile to match:
- Subject position: ${styleProfile.subject_position}
- Camera angle: ${styleProfile.camera_angle}
- Lighting tone: ${styleProfile.lighting_tone}
- Framing tightness: ${styleProfile.framing_tightness}
- Background style: ${styleProfile.background_style}
- Overall aesthetic: ${styleProfile.summary_text}`;

  const hasFewShot = fewShotExamples.length > 0;

  const introText = hasFewShot
    ? `You are a photography coach helping someone match a specific aesthetic style.

${styleProfileText}

Below are reference photos the subject has previously rated on a 1-5 scale (5 = loves it, 1 = dislikes it). Use them, together with the style profile, to calibrate what specifically separates highly-rated photos from low-rated ones (e.g. lighting, framing, angle, background, pose) before analyzing the new photo.`
    : `You are a photography coach helping someone match a specific aesthetic style.

${styleProfileText}`;

  const finalInstructionText = hasFewShot
    ? `This is the new photo to analyze. Compare it to the style profile and to the rating patterns shown in the reference photos above. Give 2 to 4 specific, actionable pieces of feedback the photographer can act on immediately (e.g. "step back and reframe wider" or "move your subject out of the harsh window light"), referencing what made the highly-rated examples work or the low-rated examples fall short where relevant. Also give a score from 0 to 100 reflecting how well the photo matches the style profile, calibrated against where it would land among the rated reference photos (a photo as good as a 5-star example should score near the top of the range, one as weak as a 1-star example should score near the bottom).

Respond with ONLY a JSON object of the form { "feedback": string[], "score": number }, no markdown formatting, no code fences, no extra commentary. Example: {"feedback": ["Move closer to fill the frame more tightly", "Turn the subject toward the window for softer light"], "score": 72}`
    : `Compare the attached photo to this style profile. Give 2 to 4 specific, actionable pieces of feedback the photographer can act on immediately (e.g. "step back and reframe wider" or "move your subject out of the harsh window light"). Also give a score from 0 to 100 reflecting how well the photo matches the style profile.

Respond with ONLY a JSON object of the form { "feedback": string[], "score": number }, no markdown formatting, no code fences, no extra commentary. Example: {"feedback": ["Move closer to fill the frame more tightly", "Turn the subject toward the window for softer light"], "score": 72}`;

  const content: Anthropic.ContentBlockParam[] = [{ type: "text", text: introText }];

  for (const example of fewShotExamples) {
    content.push({ type: "image", source: { type: "url", url: example.image_url } });
    content.push({ type: "text", text: `This photo was rated ${example.rating}/5.` });
  }

  content.push({ type: "image", source: { type: "url", url: imageUrl } });
  content.push({ type: "text", text: finalInstructionText });

  let message: Anthropic.Message;
  try {
    message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content,
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
  let score: number;
  try {
    ({ feedback, score } = extractFeedbackResult(textBlock.text));
  } catch {
    console.error("Failed to parse Claude response as JSON:", textBlock.text);
    return jsonResponse(
      { error: "Failed to parse feedback from Claude's response." },
      502,
    );
  }

  const { error: insertError } = await supabase.from("shot_attempts").insert({
    profile_id: profileId,
    image_url: imageUrl,
    feedback,
    score,
  });

  if (insertError) {
    console.error("Failed to save shot attempt:", insertError);
  }

  return jsonResponse({ feedback, score }, 200);
});
