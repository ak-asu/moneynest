# MoneyNest

MoneyNest is a Next.js financial wellness app that combines onboarding, budgeting, AI chat, document analysis, saved plans, and mini-games into one experience. It is designed to help users learn money skills in a more interactive way, with support for profile-based guidance, voice features, and library-style replay of generated content.

## What The App Does

- Guides a user through onboarding and profile setup.
- Connects financial context like income, expenses, and linked account data.
- Provides dashboard suggestions and AI-assisted coaching flows.
- Supports budgeting, planning, and document upload/extraction.
- Includes a library of saved content and mini-games.
- Tracks progress with sessions, leaderboard data, and reusable generated artifacts.

## Main Product Areas

- `app/dashboard`: landing area for authenticated users after onboarding.
- `app/onboarding`: multi-step onboarding flow for identity, income, expenses, documents, and voice path selection.
- `app/budget`: budget management, CSV import, charting, and manual entries.
- `app/chat`: conversational AI interface.
- `app/documents`: upload and review documents with extraction/visual helpers.
- `app/library`: opens saved items and embedded interactive components such as mini-games.
- `app/plans`: saved plans and plan detail APIs.
- `app/profile`: profile management.
- `app/leaderboard`: leaderboard and XP-related views.
- `app/games`: standalone game routes for selected mini-games.

## Mini-Games Included

The catalog is defined in [lib/games/catalog.ts](/c:/Users/sahil/OneDrive/Desktop/innovation_hackathon/ihack/lib/games/catalog.ts).

- Savings vs. Spending Tradeoff
- Insurance Card Game
- Credit Quest
- Financial Term Match
- FinWord Challenge
- Wealth Farm

### Credit Quest

Credit Quest is an AI-driven credit card mini-game where players manage cash, debt, and fan growth through story choices. It uses generated scenarios, live profile context, and feedback screens to teach how everyday financial decisions can affect credit health over time.

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- HeroUI
- Supabase for auth and database access
- Plaid for financial account linking/sync
- Anthropic, Gemini, ElevenLabs, and Supermemory integrations for AI and media features

## Project Structure

```text
app/
  (auth)/login          Auth UI
  api/                  Route handlers for app data, AI, documents, budget, plans, profile, etc.
  budget/               Budget page and related UI
  chat/                 AI chat experience
  dashboard/            Main dashboard
  documents/            Document upload and review
  games/                Standalone game routes
  leaderboard/          Leaderboard screen
  library/              Saved items and game previews in modals
  onboarding/           Multi-step onboarding flow
  plans/                Saved plan views
  profile/              Profile page
components/
  audio/                TTS, sound effects, and music helpers
  chat/                 Chat-specific UI
  documents/            Document visuals
  generative/           Expandable generated components and mini-game experiences
  games/                Game implementations
config/                 Fonts and site config
lib/
  ai/                   AI orchestration helpers and tools
  elevenlabs/           ElevenLabs integrations
  gemini/               Gemini integrations
  i18n/                 Localization helpers and messages
  plaid/                Plaid client/sync
  supabase/             Supabase clients
  utils/                Shared utilities
supabase/
  schema.sql            Database schema
types/
  database.ts           Database-facing types
```

## Requirements

- Node.js 20+ recommended
- npm, pnpm, yarn, or bun
- A Supabase project
- Optional provider credentials depending on which features you want enabled

## Environment Variables

Copy `.env.example` to `.env` and fill in the values you need.

### Core

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### AI And Voice

```bash
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
ELEVENLABS_API_KEY=
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=
SUPERMEMORY_API_KEY=
```

### Plaid

```bash
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Start the production server locally:

```bash
npm run start
```

Run lint autofix:

```bash
npm run lint
```

## Database Setup

The schema lives in [supabase/schema.sql](/c:/Users/sahil/OneDrive/Desktop/innovation_hackathon/ihack/supabase/schema.sql).

At a high level:

1. Create a Supabase project.
2. Apply the SQL schema from `supabase/schema.sql`.
3. Set the Supabase environment variables in `.env`.
4. Confirm auth is configured for the login flow you want to support.

## Authentication And Routing

The root route checks authentication and onboarding status before redirecting users:

- unauthenticated users go to `/login`
- users without a linked app user/profile go to `/onboarding`
- fully onboarded users go to `/dashboard`

See [app/page.tsx](/c:/Users/sahil/OneDrive/Desktop/innovation_hackathon/ihack/app/page.tsx).

## AI And Media Features

This repo includes several feature families powered by external providers:

- Anthropic-based chat and coaching flows
- Gemini-powered image/document features
- ElevenLabs text-to-speech, sound effects, music, and voice agent endpoints
- Supermemory support for memory/search-style tooling

If you do not configure a provider, any routes depending on that provider may fail until guarded or disabled.

## Library And Generative Components

The library opens saved items inside modal previews and can render interactive generated components from the component registry.

Relevant files:

- [app/library/page.tsx](/c:/Users/sahil/OneDrive/Desktop/innovation_hackathon/ihack/app/library/page.tsx)
- [components/generative/component-registry.tsx](/c:/Users/sahil/OneDrive/Desktop/innovation_hackathon/ihack/components/generative/component-registry.tsx)
- [components/generative/generative-message.tsx](/c:/Users/sahil/OneDrive/Desktop/innovation_hackathon/ihack/components/generative/generative-message.tsx)

## API Surface

The app uses App Router route handlers under `app/api`. Major groups include:

- `budget`
- `chat`
- `documents`
- `elevenlabs`
- `leaderboard`
- `plans`
- `plaid`
- `profile`
- `sessions`
- `suggestions`
- `xp`

If you are onboarding to the codebase, `app/api` is the best place to trace backend behavior for each product area.

## Styling

- Global styling lives in [styles/globals.css](/c:/Users/sahil/OneDrive/Desktop/innovation_hackathon/ihack/styles/globals.css).
- The app uses Tailwind plus shared theme variables.
- Some interactive experiences, such as the Insurance Card Game, include component-scoped styling for highly custom layouts.

## Notes For Contributors

- Prefer `rg`/ripgrep for codebase search.
- The repo uses the App Router, so server/client boundaries matter.
- Some UI flows depend on Supabase auth context and existing DB rows.
- Several features are provider-backed, so verify env configuration before debugging app logic.

## Suggested First Read For New Contributors

- [app/layout.tsx](/c:/Users/sahil/OneDrive/Desktop/innovation_hackathon/ihack/app/layout.tsx)
- [app/page.tsx](/c:/Users/sahil/OneDrive/Desktop/innovation_hackathon/ihack/app/page.tsx)
- [app/library/page.tsx](/c:/Users/sahil/OneDrive/Desktop/innovation_hackathon/ihack/app/library/page.tsx)
- [app/dashboard/page.tsx](/c:/Users/sahil/OneDrive/Desktop/innovation_hackathon/ihack/app/dashboard/page.tsx)
- [lib/supabase/server.ts](/c:/Users/sahil/OneDrive/Desktop/innovation_hackathon/ihack/lib/supabase/server.ts)
- [supabase/schema.sql](/c:/Users/sahil/OneDrive/Desktop/innovation_hackathon/ihack/supabase/schema.sql)

## License

This repository currently includes the upstream MIT `LICENSE` file. If this project is being distributed as a separate product, review whether the root package name, README, and licensing text should also be updated to match the final product identity.
