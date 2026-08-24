# Candid

Candid is an iOS app that helps me take photos my girlfriend will actually like.

Point the camera, take a shot, and Candid scores it 0–100 against a personalized aesthetic
profile — then tells you exactly what to change ("move closer to fill the frame," "turn
toward the window for softer light") before you take the next one.

It's a personal project, not a public product — built to solve a real problem (I'm not a
great photographer, she has strong and specific taste) using an approach I found genuinely
interesting: teaching a vision model *someone's* aesthetic instead of hand-coding photography
rules.

## How it works

1. **Learn the style.** Upload a handful of reference photos she likes. An edge function
   sends them to Claude's vision API and extracts a structured style profile — subject
   position, camera angle, lighting, framing, background style.
2. **Learn from ratings.** Rate photos 1–5 stars. The highest- and lowest-rated examples are
   fed back into the model as few-shot examples, so feedback improves as more ratings come in.
3. **Shoot and score.** Take a photo in-app. It's compared against the style profile *and*
   the few-shot examples, and comes back with a 0–100 score plus specific, actionable
   feedback — in real time, before you leave the moment.

Every attempt (image, score, feedback) is logged, building a growing dataset for future
personalization.

## Architecture

```
┌─────────────────────┐        ┌──────────────────────────┐        ┌──────────────┐
│  React Native (Expo) │──────▶│  Supabase Edge Functions  │──────▶│  Claude API  │
│  camera · picker ·   │       │  (Deno, TypeScript)       │       │  (vision)    │
│  rating UI           │◀──────│  feedback / extract-style │◀──────│              │
└──────────┬───────────┘        └───────────┬──────────────┘        └──────────────┘
           │                                 │
           ▼                                 ▼
   Supabase Storage                  Supabase Postgres
   (photos bucket)                   (profiles, style_profiles,
                                       rated_photos, shot_attempts)
```

- **Frontend:** React Native + Expo (TypeScript), React Navigation bottom tabs
- **Backend:** Supabase Edge Functions (Deno/TypeScript) — the Claude API key never
  touches the client; every model call is proxied server-side
- **Database/Storage:** Supabase Postgres + Storage
- **AI:** Claude (vision + few-shot prompting) — no custom-trained model, just carefully
  structured prompts built from real preference data

## A few decisions worth calling out

- **HEIC → JPEG conversion pipeline.** iPhone photos default to HEIC, which Claude's vision
  API rejects outright. Every upload path runs images through `expo-image-manipulator`
  (convert + resize to max width 1200px) before they ever hit Supabase Storage.
- **Few-shot personalization over fine-tuning.** Rather than training a custom model, the
  feedback function dynamically pulls the top- and bottom-rated reference photos and includes
  them as labeled examples in the prompt — a cheaper, faster iteration loop for a
  single-person preference model, with a graceful fallback to style-profile-only feedback
  when there isn't enough rating data yet.
- **Secrets stay server-side.** The Anthropic API key and Supabase service-role key exist
  only as Edge Function environment secrets, never in the client bundle or the repo.

## Project structure

```
candid/
├── App.tsx
├── src/
│   ├── screens/        # Home, Reference Photos, Rate Photos, Camera
│   ├── components/     # Shared UI (style summary card, error text, etc.)
│   ├── constants/       # Shared theme (colors, spacing, typography)
│   ├── utils/           # Upload helpers (HEIC→JPEG conversion, etc.)
│   └── lib/              # Supabase client init
└── supabase/
    ├── functions/
    │   ├── feedback/         # Scores a photo against the style profile + few-shot examples
    │   └── extract-style/    # Builds a style profile from reference photos
    └── migrations/           # Postgres schema
```

## Running it locally

This is a single-user personal project (no auth, one hardcoded profile), but the setup is
standard Expo + Supabase:

```bash
npm install
cp .env.example .env   # fill in your own Supabase project URL + anon key
npm start
```

The Edge Functions require their own secrets (`ANTHROPIC_API_KEY`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`) set via `supabase secrets set`, plus the Postgres schema in
`supabase/migrations/` applied to a Supabase project with a `photos` Storage bucket.

## Status

iOS only, currently in the pre-launch (TestFlight) phase. Core personalization loop —
style profile extraction, star ratings, few-shot-informed feedback, and live camera
scoring — is built and verified end to end on a physical device.
