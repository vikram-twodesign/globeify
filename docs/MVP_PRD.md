# {PRODUCT_NAME} — Product Requirements Document

> **Replace `{PRODUCT_NAME}` globally once the name is chosen.**
> Working candidates: Globeify, Pinplanet, Orbitly, Worldpin, Setglobe.

---

## 1. Summary

{PRODUCT_NAME} is a web-based tool that lets anyone build a beautiful, interactive, grayscale-first spinning 3D globe — with pinned locations and short descriptions — and embed it on any website with a single line of code. No design skill required, no coding required.

The output is deliberately lightweight and platform-agnostic: a user creates their globe in our editor, and embeds it anywhere (Webflow, Squarespace, WordPress, Framer, Notion sites, raw HTML, React apps) using a one-line script tag or iframe snippet.

Think: "Calendly for interactive world maps." Small scope, beautifully executed, genuinely useful.

---

## 2. Target Users

Primary:

1. **Travel bloggers and personal site owners** — "places I've been" maps.
2. **Small and mid-sized businesses** — "where we've shipped" / "our customers" / office locations.
3. **Event organisers and conferences** — attendee origin maps.
4. **Portfolio sites** — writers, designers, consultants showing international client presence.
5. **Newsletter and blog writers** — embedding maps in posts.

Common denominator: wants something polished and interactive, doesn't want to touch code or wrestle with Google Maps / Mapbox, values aesthetics.

---

## 3. Core Product Principles

1. **Aesthetics first, always.** The default globe should look genuinely beautiful out of the box — better than anything the user could easily build themselves. This is the product's entire differentiator.
2. **Opinionated minimalism.** Four-colour palettes, curated themes, refined typography. Constraints produce better output than freedom.
3. **One-line embed.** Copy, paste, done. No build step. No library to install.
4. **Edit anywhere, update everywhere.** Globes are hosted. Editing a globe updates every embed live.
5. **Craft in every surface.** The editor UI matters as much as the output. If the editor feels clunky, people won't trust the output to look good.

---

## 4. Key User Flows

### Flow A: First-time user creates a globe
1. Lands on marketing page with a live interactive demo globe.
2. Clicks "Create your own" → sign up (email magic link or Google).
3. Lands in editor with a blank globe + default palette.
4. Adds 3–5 pins (either by typing city name with autocomplete, or entering lat/lng).
5. Picks a theme (dark/light/custom).
6. Clicks "Embed" → modal appears with three copy-paste options: script tag, iframe, or download HTML.
7. Pastes into their site. Done.

### Flow B: Returning user edits an existing globe
1. Signs in → lands on dashboard showing their globes as preview tiles.
2. Clicks a globe → editor opens with their data loaded.
3. Makes changes → auto-saves to Firestore.
4. Changes propagate to every embed within a few seconds (cache revalidation via Firestore listener + CDN purge).

### Flow C: A visitor views an embedded globe on a third-party site
1. Page loads. The script tag or iframe injects the globe into the page.
2. Visitor sees the spinning globe, hovers/clicks pins, reads descriptions.
3. A subtle "Made with {PRODUCT_NAME}" credit appears (free tier). Removable on paid tier.

---

## 5. Feature Specifications (MVP)

### 5.1 Authentication
- Firebase Auth with email magic link and Google OAuth providers.
- Free tier: up to 3 globes per user. Paid tier gating can come later.
- Auth state persisted via Firebase SDK's default IndexedDB storage.

### 5.2 Dashboard (`/dashboard`)
- Grid of the user's globes as preview cards.
- Each card shows: globe thumbnail (auto-generated screenshot or live mini-preview), name, last edited, pin count, published status.
- Actions per card: edit, duplicate, delete, copy embed.
- Primary CTA: "New Globe."

### 5.3 Globe Editor (`/edit/[globeId]`)

The editor is the heart of the product. It should feel calm, uncluttered, and precise.

**Layout:** Three-column desktop layout.
- **Left panel (280px):** Settings — theme, behaviour, metadata.
- **Centre:** The live globe preview (fills available space).
- **Right panel (320px):** Pins list + add-pin form.

On mobile/tablet: tabs at the bottom switch between panels, globe always visible above.

**Pins panel features:**
- Add pin by:
  - **Search:** Type "Mumbai" → autocomplete suggests results from OpenStreetMap Nominatim (free, no API key required, 1 req/sec limit — acceptable for this interaction pattern). Proxy through a Cloud Function to add caching and respect Nominatim's usage policy.
  - **Manual coordinates:** Lat/lng fields for precision users.
- Each pin has: name (required), latitude, longitude, description (optional, supports basic markdown: **bold**, *italic*, links), optional URL (clicking the pin on the embed opens this URL).
- Inline editing — click a pin in the list to expand, edit, collapse.
- Drag to reorder pins (affects the order in tour mode, post-MVP).
- Click a pin name to smoothly rotate the globe to it (as in the prototype).

**Settings panel features:**
- **Name** — free-text field.
- **Theme picker:**
  - **Presets:** 6 curated themes, each a 4-colour palette. Examples: Graphite (current monochrome dark), Paper (monochrome light), Midnight Blue, Sand, Forest, Ice. See Section 6 for palette specifications.
  - **Custom:** Reveals 4 colour pickers — `background`, `land`, `border`, `pin`. UI must communicate the role of each clearly.
  - Live preview updates instantly.
- **Light/Dark toggle** — single switch that swaps between the currently selected theme and its light/dark counterpart. Only available when the selected theme has a paired counterpart.
- **Globe behaviour:**
  - Auto-rotate (on/off).
  - Rotation speed (slow/medium/fast slider).
  - Show graticule lines (on/off).
  - Show country borders (on/off).
  - Idle behaviour after interaction (resume rotation / stay still).
- **Pin style:**
  - Size (small/medium/large).
  - Show base ring (on/off).
  - Pulse animation (on/off).
- **Metadata (optional, for embed SEO):** Title, description — injected as meta tags into the embed iframe.

All changes auto-save to Firestore within ~800ms of the last edit (debounced).

### 5.4 Embed & Export (modal in editor, `/embed/[globeId]` on public side)

Modal shows three tabs:

**Tab 1: Script Tag (primary, recommended)**
```html
<div id="{PRODUCT_NAME}-abc123"></div>
<script src="https://{PRODUCT_NAME}.web.app/embed.js" data-globe="abc123" async></script>
```
The script loads async, finds the div, and injects a responsive iframe pointed at `/embed/abc123`. This is the one line most users should copy.

**Tab 2: Iframe**
```html
<iframe src="https://{PRODUCT_NAME}.web.app/embed/abc123" width="100%" height="600" frameborder="0" style="border-radius:8px;"></iframe>
```
Fallback for platforms that strip `<script>` tags (some Notion-style CMSes).

**Tab 3: Download HTML**
A fully self-contained HTML file with the globe baked in. For users who want to self-host or use offline. This version won't get live updates, which should be clearly communicated.

Embed modal should also show a size preview (dimensions slider) and let users copy with one click.

### 5.5 Public Embed View (`/embed/[globeId]`)
- Ultra-lightweight page: just the globe, no chrome.
- Loads geography data once, then user's pins over it.
- Respects all the user's theme and behaviour settings.
- Small "Made with {PRODUCT_NAME}" mark bottom-right (free tier only).
- Must be fully responsive and render well from 300×300 up to full-screen.
- Clicking a pin opens the detail card in-place (as in the prototype).
- If a pin has a URL set, the detail card includes a "Learn more" link.

---

## 6. Design Direction

**Important for Claude Code:** Use the `frontend-design` skill when building the editor UI and the marketing page. Read `/mnt/skills/public/frontend-design/SKILL.md` first.

**Aesthetic brief:**
- Editorial, refined, confident. Think a mix of Linear's restraint, Vercel's precision, and the tactile quality of a well-designed print magazine.
- Monochrome-dominant interface (grays, whites, blacks) with a single restrained accent.
- Typography should be distinctive — not Inter, not system-ui. Consider a pairing like *Instrument Serif* (display) + *DM Sans* or *Inter Display* (body), or *General Sans* throughout with careful weight contrast.
- Generous whitespace. Asymmetry where it helps. No gradient-heavy AI-generic look.
- Micro-interactions should feel intentional — a pin drop should have a tiny satisfying bounce, a save indicator should feel considered, not decorative.

**Preset theme palettes** (all four values required per theme):

| Theme | Background | Land | Border | Pin |
|-------|------------|------|--------|-----|
| **Graphite** (dark, default) | `#0a0a0a` | `#252525` | `#3d3d3d` | `#ffffff` |
| **Paper** (light) | `#f6f4ef` | `#e2ddd3` | `#b8b0a1` | `#1a1a1a` |
| **Midnight** (dark blue) | `#0a0f1c` | `#1a2236` | `#2d3a56` | `#cfd8e8` |
| **Ice** (light blue) | `#eef3f8` | `#d5e0ec` | `#9fb0c3` | `#1a2a3d` |
| **Sand** (warm light) | `#f3ede4` | `#d9c9b4` | `#a68f73` | `#3b2e23` |
| **Forest** (dark green) | `#0c1410` | `#1e2b22` | `#35493b` | `#e8ebe4` |

Themes come in dark/light pairs where sensible (Graphite ↔ Paper, Midnight ↔ Ice, Forest ↔ Sand), so the light/dark toggle swaps between paired themes.

---

## 7. Technical Architecture

**Stack:**

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 15 (App Router)** with **static export** (`output: 'export'`) | Client-rendered app with good DX; static output deploys cleanly to Firebase Hosting |
| Styling | **Tailwind CSS + shadcn/ui** | Fast build, accessible primitives, easy to customise |
| 3D | **Three.js (r160+)** | Proven in our prototype |
| Geography data | **world-atlas 110m TopoJSON** | Small (~100kb), already working in prototype |
| Geocoding | **OpenStreetMap Nominatim** (MVP), proxied via Cloud Function | Free, no API key |
| Auth | **Firebase Auth** | Magic-link email + Google OAuth |
| Database | **Firestore** | Document DB, works well with the globe/pins data shape |
| Serverless | **Firebase Cloud Functions (2nd gen)** | For the geocode proxy and any server-side embed rendering |
| Hosting | **Firebase Hosting** | Global CDN, integrated deploy via CLI, single-vendor stack |
| Analytics | **Firebase Analytics** or **Plausible** | Both privacy-friendly options; Firebase Analytics is one line of setup |

**Why static export for Next.js:**
This keeps the entire app as static HTML/CSS/JS files served from Firebase Hosting's CDN. Editor and dashboard are authenticated client-rendered pages. The `/embed/[globeId]` route is the only tricky part — covered in Section 10.

**Rendering strategy for the globe itself:**
Use the canvas-texture approach from the final prototype (drawing countries to a 4096×2048 canvas in equirectangular projection, then wrapping that as a texture on the sphere). Much cleaner than triangulated 3D fills. See the attached prototype HTML for reference implementation.

---

## 8. Data Model (Firestore)

Firestore's document model maps naturally here. Use a top-level `globes` collection and a `pins` subcollection under each globe.

### Collections

**`/users/{userId}`** — user profile metadata
```js
{
  email: string,
  displayName: string | null,
  createdAt: Timestamp,
  globeCount: number,            // denormalised counter, max 3 on free tier
  tier: 'free' | 'pro',          // for future paid-tier gating
}
```

**`/globes/{globeId}`** — one document per globe (globeId is an 8-char nanoid)
```js
{
  ownerId: string,               // Firebase Auth UID
  name: string,                  // default "Untitled Globe"
  themePreset: string,           // one of 6 presets or 'custom'
  themeColors: {
    background: string,
    land: string,
    border: string,
    pin: string,
  },
  behaviour: {
    autoRotate: boolean,
    rotationSpeed: 'slow' | 'medium' | 'fast',
    showGraticule: boolean,
    showBorders: boolean,
    idleBehaviour: 'resume' | 'stay',
  },
  pinStyle: {
    size: 'small' | 'medium' | 'large',
    showRing: boolean,
    pulse: boolean,
  },
  metadata: {                    // for embed SEO
    title: string | null,
    description: string | null,
  },
  isPublished: boolean,          // defaults true; toggle to hide embed publicly
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

**`/globes/{globeId}/pins/{pinId}`** — subcollection of pins
```js
{
  name: string,
  lat: number,
  lng: number,
  description: string | null,    // supports basic markdown
  url: string | null,
  sortOrder: number,             // for ordering
  createdAt: Timestamp,
}
```

### Firestore Security Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read/write only their own user doc.
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Globes: owner has full access. Public can read only if published.
    match /globes/{globeId} {
      allow read: if resource.data.isPublished == true
                  || (request.auth != null && resource.data.ownerId == request.auth.uid);
      allow create: if request.auth != null
                    && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if request.auth != null
                            && resource.data.ownerId == request.auth.uid;

      // Pins follow the same rules as their parent globe.
      match /pins/{pinId} {
        allow read: if get(/databases/$(database)/documents/globes/$(globeId)).data.isPublished == true
                    || (request.auth != null
                        && get(/databases/$(database)/documents/globes/$(globeId)).data.ownerId == request.auth.uid);
        allow write: if request.auth != null
                     && get(/databases/$(database)/documents/globes/$(globeId)).data.ownerId == request.auth.uid;
      }
    }
  }
}
```

### Firestore Indexes
Composite index needed for listing a user's globes ordered by update time:
- Collection: `globes`
- Fields: `ownerId` Ascending, `updatedAt` Descending

Auto-generated the first time the query runs — Firestore console will link you to create it.

---

## 9. API & Routes

### Client-side pages (Next.js static export)
- `/` — marketing page with live demo globe, features, pricing, CTA.
- `/login` — auth.
- `/dashboard` — user's globes grid (reads Firestore directly via SDK).
- `/edit/[globeId]` — the editor (reads/writes Firestore directly via SDK, with auto-save debouncing).
- `/embed/[globeId]` — the public embed (reads Firestore with unauthenticated rules; `isPublished` gate).
- `/download/[globeId]` — client-side generates and downloads a standalone HTML file.

### Cloud Functions (HTTPS callable or HTTP)
- `geocode(query: string)` — proxy to Nominatim with server-side caching (~24h) and rate limiting per UID. Use a callable function so Firebase Auth context is automatic.
- `generateThumbnail(globeId: string)` — (optional, v1.5) puppeteer-based screenshot of a globe for dashboard cards. Can be stubbed with a placeholder in MVP.

### Static assets
- `/embed.js` — the embed loader script, served from Firebase Hosting with long cache headers (see Section 10).

### Firebase SDK use from client
Most CRUD happens directly from the client via the Firestore SDK — no need for custom API routes. Security rules (Section 8) enforce access. This is the Firebase-native pattern and keeps the codebase small.

---

## 10. Embed Implementation Details

### `embed.js` loader (served from `/embed.js`)
```js
(function() {
  const scripts = document.querySelectorAll('script[data-globe]');
  scripts.forEach(script => {
    if (script.dataset.loaded) return;
    script.dataset.loaded = 'true';
    const globeId = script.dataset.globe;
    const container = document.getElementById(`{PRODUCT_NAME}-${globeId}`)
      || script.parentElement;
    const iframe = document.createElement('iframe');
    iframe.src = `https://{PRODUCT_NAME}.web.app/embed/${globeId}`;
    iframe.style.cssText = 'width:100%;height:600px;border:0;border-radius:8px;display:block;';
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('title', 'Interactive globe');
    container.appendChild(iframe);
  });
})();
```

This script must be **aggressively cached** (one year, immutable) and **tiny** (< 2kb gzipped). It should never change in behaviour — all globe-specific rendering lives in the iframe. Set cache headers via `firebase.json`:

```json
{
  "hosting": {
    "headers": [
      {
        "source": "/embed.js",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" },
          { "key": "Access-Control-Allow-Origin", "value": "*" }
        ]
      }
    ]
  }
}
```

### `/embed/[globeId]` page
Client-rendered static page. On load:
1. Reads the globe document from Firestore (public read allowed by security rules when `isPublished == true`).
2. Reads the pins subcollection.
3. Initialises Three.js with the user's theme, behaviour, and pins.

Firestore has built-in CDN caching for reads, so repeat loads on the same globe come back fast.

**Live update strategy:** The embed page subscribes to the Firestore document with `onSnapshot`. When the owner saves changes in the editor, all live embeds update within a second or two without a page refresh. This is a quietly excellent Firebase-native feature.

---

## 11. Post-MVP Roadmap (not required for v1)

These are deliberately out of scope for MVP. Mentioning for architectural awareness only:

- **Pin categories** — group pins by colour/icon (e.g. "clients" vs "offices").
- **Connection lines** — draw arcs between pins.
- **Tour mode** — embed auto-cycles through pins on a timer.
- **Custom pin icons** — upload SVG/emoji to Firebase Storage.
- **Team workspaces** — shared globes, per-seat pricing.
- **Custom domain embeds** — paid tier.
- **Analytics dashboard** — views, interactions, popular pins.
- **Bulk import** — CSV of pins.
- **White-label / branding removal** — paid tier.
- **API access** — programmatic globe creation via Cloud Functions.

---

## 12. Non-Goals for v1

To keep scope honest:

- **Not a mapping/routing tool.** No driving directions, no heatmaps, no choropleth data overlays.
- **Not a GIS tool.** No shapefile import, no custom geography uploads.
- **Not a competitor to Mapbox/Google Maps.** Explicitly a stylised 3D globe for showcasing locations, not navigating them.
- **No real-time collaborative editing** in v1. One editor at a time is fine.
- **No native mobile apps.** Web responsive only.

---

## 13. Success Metrics (for Vik's reference, not for Claude Code)

- Time-to-first-embed: under 3 minutes from sign-up.
- Free-to-paid conversion: measured after 4 weeks.
- Embeds per active user: targeting 1.5+ (most users embed in more than one place).
- Lighthouse performance score for `/embed/[id]`: 95+.

---

## 14. Open Decisions for Founder

These need a call before or during build — flagging for visibility:

1. **Final product name and domain.**
2. **Free tier limits.** Currently set at 3 globes — negotiable.
3. **Pricing for paid tier.** Not in MVP scope, but worth thinking ahead.
4. **Branding credit in embeds.** Confirming "Made with {PRODUCT_NAME}" is acceptable on free tier.
5. **Geocoding provider long-term.** Nominatim is great for MVP, but at scale Mapbox or Google may be needed.
6. **Firebase Blaze vs Spark.** Spark (free) is enough to build and launch, but you'll need to upgrade to Blaze (pay-as-you-go) to use Cloud Functions, which the geocoding proxy needs. Cost should be pennies until real traffic arrives.

---

## 15. Build Order Recommendation for Claude Code

A suggested sequence to keep each step shippable:

1. **Scaffold Next.js + Tailwind + shadcn/ui.** Configure for static export.
2. **Initialise Firebase via CLI** — `firebase init` with Hosting, Firestore, Functions, Auth. Set up the Firebase emulator suite for local dev.
3. **Wire up Firebase Auth** — email magic link + Google OAuth. Get sign-up → dashboard end-to-end.
4. **Port the prototype globe component into a React component.** Accept props for theme, pins, behaviour.
5. **Build the editor route** with the three-column layout, using mock data first, then wire to Firestore with auto-save.
6. **Deploy Firestore security rules and indexes** via `firebase deploy --only firestore`.
7. **Build the `/embed/[id]` route** — public, unauthenticated, fast. Wire `onSnapshot` for live updates.
8. **Build `embed.js`** — minimal loader script. Configure long cache headers.
9. **Build the geocode Cloud Function.** Test locally via emulator, then deploy.
10. **Build the dashboard** with globe previews.
11. **Build the marketing page** — this is where `frontend-design` skill earns its keep. Live demo globe as hero.
12. **Standalone HTML export.**
13. **Polish passes** — empty states, loading states, error states, microcopy, keyboard shortcuts.

**For every UI surface, start by reading `/mnt/skills/public/frontend-design/SKILL.md`** and commit to a specific aesthetic direction before writing code.

### Firebase CLI reference for Claude Code
Key commands it will use:
- `firebase login` (user does this once)
- `firebase init hosting firestore functions` — scaffold config files
- `firebase emulators:start` — run everything locally (Firestore, Auth, Functions, Hosting)
- `firebase deploy` — full deploy
- `firebase deploy --only hosting` / `--only functions` / `--only firestore:rules` — targeted deploys

The emulator suite is a real productivity win — develop the whole app offline against a local Firestore, test security rules without consequences, iterate fast.

---

## 16. Reference Prototype

The prototype HTML (which this PRD is derived from) lives in the project root as `prototype.html`. Treat it as the canonical reference for:
- The canvas-texture rendering approach for country fills.
- Pin interaction patterns (click to focus, detail card, hover tooltip).
- The default Graphite dark theme's visual feel.
- The "spin → pause on interact → resume" rotation logic.

Do not port its structure verbatim — the production editor is a React app with different architectural needs — but the rendering techniques and interaction patterns should carry over unchanged.

---

*End of document.*
