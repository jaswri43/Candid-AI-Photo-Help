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
- App.tsx content (StyleSummaryCard + HomeScreen stacked) exceeds one screen's
  height, so the root layout uses a ScrollView. Keep this in mind when adding
  more UI to the home screen — don't remove the ScrollView without checking
  content still fits or remains scrollable.
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
- Navigation: @react-navigation/native + bottom-tabs, four tabs (Home, Reference
  Photos, Rate Photos, Camera), replacing the old toggle-button switcher in
  App.tsx. PROFILE_ID is threaded down to whichever screens need it.
- Recurring layout pattern to watch for: any screen with variable-height content
  (photo preview + results below) needs its own ScrollView and proper safe-area
  handling (react-native-safe-area-context) — this isn't automatic per-screen
  under the tab navigator. Already fixed on HomeScreen and CameraScreen's
  post-capture view. If a new screen is added with similar preview+results
  content, apply the same pattern from the start rather than hitting this bug
  again. Exception: live camera viewfinder (pre-capture) should stay fixed/
  full-screen, not scrollable.
- Shared theming lives in a small constants file (src/constants/theme.ts or
  similar) — colors, spacing, font sizes — applied consistently across all four
  screens along with ActivityIndicator loading spinners and consistent error
  message styling. Keep new UI consistent with this rather than one-off styling.

## Current phase
Phase 5 — starting (Phase 3 mechanically complete, pending real ratings)

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
- Phase 4 complete: expo-camera installed; CameraScreen built (live viewfinder →
  capture → preview with Retake/Use This Photo → upload → feedback call, with
  camera permission handling); `shot_attempts` table (RLS disabled, FK to
  profiles, score 0-100 check constraint) added; "feedback" function updated to
  also return a 0-100 score and insert a row into shot_attempts on every call;
  score displayed prominently on both CameraScreen and Home screen results;
  React Navigation bottom-tab navigator replacing the old toggle switcher (Home,
  Reference Photos, Rate Photos, Camera tabs); UI polish pass (shared theme
  constants, consistent spacing/colors/typography, ActivityIndicator loading
  states, consistent error styling); two post-navigation layout regressions
  found and fixed (missing ScrollView on Home, safe-area insets not applied
  per-screen, non-scrollable CameraScreen results view) — see Key decisions for
  the recurring pattern to watch for on future screens.
- Verified working end to end: generated a real style profile from 10 actual
  reference photos (specific, non-generic output — golden hour lighting,
  three-quarter framing, lifestyle backgrounds correctly identified); feedback
  on new photos now references these real attributes instead of generic advice;
  full camera → capture → score + feedback → shot_attempts persistence flow
  confirmed working on physical device.

## What's in progress
- Starting Phase 5 (v1 ship): error handling audit, secrets audit, app icon +
  splash screen, EAS Build → TestFlight submission.
- Still pending, not blocking: real ratings from girlfriend (20-30 per PRD) to
  replace placeholder data in rated_photos and validate Phase 3's actual
  personalization quality. Revisit when possible.

## Do not modify
- N/A

---
## How to update this file
After completing each phase, update "Current phase", "What's built", and
"Do not modify" before starting the next Claude Code session. Re-upload to
the Candid Claude Project so planning conversations stay current too.
