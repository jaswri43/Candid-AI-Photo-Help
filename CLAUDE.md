# Candid — Project Context for Claude Code

## What this app is
Candid is a personal iOS app that helps me take photos my girlfriend will like.
It learns her aesthetic preferences through reference photos and a 1–5 star rating
system, then gives me real-time feedback and a 0–100 score when I take a new photo.
This app is for personal use only — not built for public distribution.

## Tech stack
- **Frontend:** React Native with Expo (TypeScript)
- **Backend:** Supabase Edge Functions (TypeScript)
- **Database:** Supabase Postgres
- **Storage:** Supabase Storage (bucket: "photos")
- **AI:** Claude API — model: claude-sonnet-4-6 (vision + few-shot prompting)

## Project structure
```
candid/
├── CLAUDE.md               ← you are here
├── .env                    ← never commit this
├── app.json
├── package.json
├── src/
│   ├── screens/            ← one file per screen
│   ├── components/         ← reusable UI components
│   ├── utils/              ← helper functions (upload, api calls)
│   └── lib/
│       └── supabase.ts     ← supabase client init
└── supabase/
    └── functions/          ← edge functions live here
        ├── feedback/       ← analyses a photo vs style profile + ratings
        └── extract-style/  ← extracts style profile from reference photos
```

## Database tables
- `profiles` — subject profile (name, notes)
- `reference_photos` — photos uploaded to teach the style profile
- `style_profiles` — extracted style attributes per profile
- `rated_photos` — photos rated 1–5 by girlfriend for few-shot learning
- `shot_attempts` — photos taken in-app with score + feedback

## Key decisions
- Single hardcoded profile for v1 — no auth, no multi-user
- Claude API key lives ONLY in the edge function environment — never in frontend
- Few-shot prompting (not a custom trained model) for preference learning
- iOS only for v1 — no Android support
- `shot_attempts` table is built in Phase 4 to store each attempt's image, score,
  and feedback (needed for future few-shot data) — but there is NO dedicated
  history/gallery screen in v1. Shot history UI is out of scope per the PRD.
  Don't add a history screen unless this decision is revisited.
- Images are converted to JPEG (and resized to max width 1200px) via
  expo-image-manipulator BEFORE upload to Supabase Storage. This is required —
  iPhone photos default to HEIC, which Claude's vision API rejects
  ("file format is invalid or unsupported"). Any new upload path must go
  through this same conversion step, not just the original uploadImage.ts.
- A single real row exists in `profiles` (id: 03b30593-5e35-4ec8-b834-1dfd2b7997ab)
  and is hardcoded as PROFILE_ID throughout the app (App.tsx, ReferencePhotosScreen,
  feedback function calls). Real profile creation UI is deferred — don't build it
  unless asked; keep using this hardcoded ID.
- Navigation is React Navigation (`@react-navigation/native` +
  `@react-navigation/bottom-tabs`, with `react-native-screens` /
  `react-native-safe-area-context` peers) — a bottom tab navigator with four
  tabs (Home, Reference Photos, Rate Photos, Camera), replacing the earlier
  toggle-button screen switcher. App.tsx only sets up SafeAreaProvider +
  NavigationContainer + Tab.Navigator and a small per-tab wrapper for Home
  (StyleSummaryCard + HomeScreen); it does not contain screen-switching logic.
  Each screen still receives PROFILE_ID as a `profileId` prop from App.tsx
  (ReferencePhotosScreen now takes this as a prop too, instead of its own
  hardcoded constant, for consistency with the other screens).
- Getting real ratings from girlfriend is blocked for now (scheduling), so the
  few-shot integration is being built and mechanically tested with placeholder/
  self-entered ratings in rated_photos. This proves the plumbing (fetch top/bottom
  rated photos, build few-shot prompt, no errors) but NOT that scores reflect her
  actual taste — that validation must happen later once real ratings replace the
  placeholder data. Don't treat placeholder-rating test results as proof the
  personalization works.
- Decision: proceed to Phase 4 (camera + full UX) after the few-shot mechanism
  is verified, without waiting for real ratings — Phase 4 has no dependency on
  ratings data. Real ratings can be collected in parallel and swapped in later.
- `npm audit` reports 11 moderate vulnerabilities (postcss XSS, uuid buffer bounds
  check) in nested Expo/Metro build tooling. DO NOT run `npm audit fix --force` —
  the only fix path bumps to expo@57.0.4, which reintroduces the exact Expo Go
  App Store incompatibility already fixed by downgrading to SDK 54. Both
  vulnerabilities are in build-time tooling, not runtime app code, and not
  meaningfully exploitable in this context (no untrusted CSS input, no manual
  uuid buffer usage). Leave as-is until Expo Go's App Store version catches up
  to SDK 57 (or later), then revisit.

## Current phase
Phase 4 — starting (Phase 3 mechanically complete, pending real ratings)

## What's built
- Phase 1 complete: Expo project scaffold (SDK 54 — App Store Expo Go compatibility,
  not the newer SDK 57 the project was originally created with), Supabase project +
  "photos" Storage bucket, image upload utility (with HEIC→JPEG conversion via
  expo-image-manipulator), "feedback" edge function, single-screen UI wiring
  image picker → upload → feedback call → feedback list display.
- Phase 2 complete: `profiles`, `reference_photos`, `style_profiles` tables (RLS
  disabled, single-user app); "extract-style" edge function (multi-image vision
  call → structured style profile → upserted to style_profiles); ReferencePhotosScreen
  (multi-image picker up to 10, upload progress, Generate Style Profile button);
  StyleSummaryCard component rendering the saved profile; "feedback" function
  updated to fetch and use the real style profile (by profileId) instead of the
  Phase 1 hardcoded one.
- Phase 3 mechanically complete: `rated_photos` table (RLS disabled, FK to
  profiles, rating 1-5 check constraint); RatingScreen (single-photo picker →
  upload → 1-5 star tap UI → submit → running count), verified working; "feedback"
  function updated to fetch top/bottom rated photos and include them as few-shot
  examples in the Claude prompt (falls back to style-profile-only if fewer than 2
  rated photos exist). Tested successfully with placeholder/self-entered ratings —
  confirms the plumbing works end to end without errors.
- NOT yet verified: whether few-shot personalization actually reflects girlfriend's
  real taste — this requires real ratings from her (20-30 per PRD), which haven't
  been collected yet due to scheduling. Placeholder ratings currently in
  rated_photos should be considered temporary test data, not real signal.
- Verified working end to end: generated a real style profile from 10 actual
  reference photos (specific, non-generic output — golden hour lighting,
  three-quarter framing, lifestyle backgrounds correctly identified); feedback
  on new photos now references these real attributes instead of generic advice.
- Phase 4 in progress: `shot_attempts` table added (RLS disabled, FK to profiles,
  score 0-100 check constraint); CameraScreen (live viewfinder via expo-camera,
  capture → preview → "Use This Photo"/"Retake" → upload → feedback call, added
  as a fourth screen toggle alongside Home/Reference Photos/Rate Photos);
  "feedback" function now asks Claude for a 0-100 score alongside the feedback
  array (response shape `{ feedback: string[], score: number }`) and writes
  each attempt to shot_attempts after a successful call. Home screen's existing
  Analyse flow updated to display the score too, for consistency with Camera.

## What's in progress
- Phase 4 (in-app camera + full UX) continuing per decision to not block on real
  ratings. Real ratings from girlfriend will be collected whenever possible and
  should replace the placeholder data in rated_photos when available — revisit
  Phase 3 validation (does score/feedback match her actual taste) at that point.
  Same caveat now applies to the 0-100 score: it's being generated and stored,
  but whether it tracks her actual taste is unverified until real ratings exist.

## Do not modify
- N/A

---
## How to update this file
After completing each phase, update "Current phase", "What's built", and
"Do not modify" before starting the next Claude Code session. Re-upload to
the Candid Claude Project so planning conversations stay current too.
