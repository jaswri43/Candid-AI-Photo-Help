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

## Current phase
Phase 1 — starting

## What's built
- Nothing yet

## What's in progress
- Nothing yet

## Do not modify
- N/A

---
## How to update this file
After completing each phase, update "Current phase", "What's built", and
"Do not modify" before starting the next Claude Code session. Re-upload to
the Candid Claude Project so planning conversations stay current too.
