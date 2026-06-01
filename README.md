# Globeify

An interactive 3D globe builder. Create a globe, drop pins on locations, customise the look, and embed it anywhere with a single script tag.

**Live:** [globeify.web.app](https://globeify.web.app)

---

## What it does

- Sign in with email (magic link) or Google
- Create and name globes from your dashboard
- Drop pins with names, descriptions, and optional links
- Pick a theme or build a custom colour palette
- Tune globe behaviour (auto-rotate, speed, graticule, borders)
- Embed on any site via a `<script>` tag, `<iframe>`, or a self-contained HTML download
- Public embed pages update live via Firestore

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (static export) |
| UI | React 19, Tailwind CSS v4 |
| 3D rendering | Three.js |
| Geography | world-atlas (TopoJSON) |
| Backend | Firebase (Auth, Firestore, Hosting) |
| Cloud Function | Firebase Functions v2 (geocode proxy) |
| Language | TypeScript |
| Package manager | pnpm |

---

## Project structure

```
├── app/                     # Next.js App Router pages
│   ├── page.tsx             # Marketing home page
│   ├── login/               # Magic-link + Google auth
│   ├── dashboard/           # Globe listing
│   ├── edit/[globeId]/      # Globe editor
│   ├── embed/[globeId]/     # Public embeddable globe (no auth)
│   └── download/[globeId]/  # Self-contained HTML download
│
├── components/
│   ├── globe/               # Three.js globe core + React wrapper
│   │   ├── topo.ts          # TopoJSON decoder + antimeridian splitting
│   │   ├── geoTexture.ts    # Country rendering onto a canvas texture
│   │   ├── globeCore.ts     # GlobeScene: Three.js scene, pins, rotation
│   │   └── Globe.tsx        # React wrapper
│   ├── editor/              # Globe editor UI panels
│   ├── dashboard/           # Globe cards
│   ├── marketing/           # Landing page sections
│   └── ui/                  # Shared UI primitives (Button, Input, etc.)
│
├── lib/
│   ├── firebase/            # Firebase client, auth helpers, Firestore CRUD
│   ├── types.ts             # Core types: Globe, Pin, ThemeColors, etc.
│   ├── themes.ts            # 6 theme presets (graphite, paper, midnight, ice, sand, forest)
│   ├── defaults.ts          # Default globe settings + free-tier limit
│   ├── globe-routes.ts      # Route builder/extractor helpers
│   ├── standalone-html.ts   # Self-contained HTML generator
│   ├── geocode.ts           # Client wrapper for geocode Cloud Function
│   └── url.ts               # URL sanitisation
│
├── functions/               # Firebase Cloud Functions (separate Node project)
│   └── src/index.ts         # geocode — Nominatim proxy with caching + rate limiting
│
├── public/
│   └── embed.js             # Tiny iframe loader for third-party embeds
│
└── firebase.json            # Hosting rewrites, emulator config, Firestore rules path
```

---

## Getting started

### Prerequisites

- Node.js 22+
- pnpm (`npm install -g pnpm`)
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project (Blaze plan required for Cloud Functions)

### 1. Clone and install

```bash
git clone https://github.com/vikram-twodesign/globeify.git
cd globeify
pnpm install
```

### 2. Configure environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Run locally

```bash
pnpm dev          # Next.js dev server at http://localhost:3000
```

To run with Firebase emulators (Auth, Firestore, Functions, Hosting):

```bash
firebase emulators:start
```

Emulator ports: Auth `9099`, Firestore `8080`, Functions `5001`, Hosting `5000`.

---

## Development commands

```bash
pnpm dev          # Start dev server
pnpm build        # Static export to out/
pnpm lint         # ESLint

# Firebase
firebase emulators:start                    # Run all emulators locally
firebase deploy --only firestore            # Deploy Firestore rules + indexes
firebase deploy --only hosting              # Deploy static export
firebase deploy --only functions:geocode    # Deploy geocode function (Blaze plan required)

# Cloud Functions
cd functions && npm run build               # Compile TypeScript
cd functions && npm run serve               # Build + start functions emulator
```

---

## Deployment

Pushes to `main` trigger the GitHub Actions workflow (`.github/workflows/firebase-hosting-merge.yml`), which builds the Next.js static export and deploys to Firebase Hosting automatically.

Pull requests get preview channel deployments via `.github/workflows/firebase-hosting-pull-request.yml`.

Required GitHub secrets:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
NEXT_PUBLIC_SITE_URL
FIREBASE_SERVICE_ACCOUNT_GLOBEIFY_A5C27
```

---

## Embedding a globe

**Script tag (recommended)**

```html
<script src="https://globeify.web.app/embed.js" data-globe="YOUR_GLOBE_ID"></script>
```

The script injects an iframe into its parent element. Optional attributes:

| Attribute | Default | Description |
|---|---|---|
| `data-height` | `600` | Height in px (or any CSS value) |
| `data-origin` | auto-detected | Override the Globeify origin URL |

**Direct iframe**

```html
<iframe src="https://globeify.web.app/embed/YOUR_GLOBE_ID"
  style="width:100%;height:600px;border:0;border-radius:8px;">
</iframe>
```

**Standalone HTML download**

From the editor, download a self-contained `.html` file — no Firestore dependency, loads Three.js from CDN, works offline.

---

## Themes

Six built-in presets, each with a paired light/dark counterpart:

| Theme | Mode | Paired with |
|---|---|---|
| Graphite | Dark | Paper |
| Paper | Light | Graphite |
| Midnight | Dark | Ice |
| Ice | Light | Midnight |
| Forest | Dark | Sand |
| Sand | Light | Forest |

A **Custom** mode lets you set any hex colour for background, land, borders, and pins.

---

## Architecture notes

### Static export + dynamic routes

Next.js exports fully static HTML. Dynamic routes (`/edit/[globeId]`, `/embed/[globeId]`, `/download/[globeId]`) each export only a `_placeholder_` path. Firebase Hosting rewrites all traffic under those segments to the placeholder. Client-side code extracts the real globe ID from the URL or query string via `lib/globe-routes.ts`.

### Globe rendering

The globe renders using a canvas-texture approach rather than triangulated 3D fills:

1. TopoJSON polygons are decoded and antimeridian-split (`topo.ts`)
2. Countries are drawn onto a 4096×2048 canvas in equirectangular projection (`geoTexture.ts`)
3. The canvas is used as a Three.js texture on a sphere (`globeCore.ts`)

This keeps rendering fast and theme-switching instant (re-draw the canvas, swap the texture).

### Editor auto-save

Edits debounce 800 ms before writing to Firestore. While an in-flight write is pending, incoming Firestore snapshots are ignored — preventing remote data from clobbering local changes.

### Geocode Cloud Function

The `geocode` callable function proxies OpenStreetMap Nominatim. It enforces: authentication required, 20 requests per 60 s per user, 24 h in-memory LRU cache (max 500 entries), and ≥1100 ms spacing between outbound Nominatim calls to comply with their usage policy.

### Firestore security

Globes and their pins are readable by the public only when `isPublished = true`. All writes require authentication and ownership verification. Pin URLs are validated to `http://https` schemes only.

---

## Tiers

| | Free | Pro |
|---|---|---|
| Globes | 3 | Unlimited |

---

## Fonts

- **Instrument Serif** — display headings
- **DM Sans** — body text
- **JetBrains Mono** — code/embed snippets

---

## Licence

MIT Licence.
