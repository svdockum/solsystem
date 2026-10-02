# SolSystem — Architecture Decision Record

## Framework: Nuxt 4

**Chosen:** Nuxt 4 (`~4.4`) with `app/` directory layout, rendered client-side only (`ssr: false`)
**Why:** Matches the conventions of the companion `fisc` project in this monorepo. Auto-imports composables, components, and pages.
**Version pin:** Nuxt 4.5+ requires Node 22.19; the pin can be lifted once Node is upgraded.
**Alternative considered:** Plain Vite + Vue 3 SPA — rejected because Nuxt's routing, auto-imports, and runtime config management reduce boilerplate significantly.

---

## 3D Engine: Three.js

**Chosen:** `three` v0.186 + raw composable wrappers (`useSolarScene`, `usePlanetMeshes`, `useCometTrails`)
**Why:** Three.js is the most mature WebGL library with TypeScript types, wide browser support, and no React dependency. The composable pattern integrates naturally with Vue 3's `onMounted`/`onUnmounted` lifecycle.
**Alternatives considered:**
- `@tresjs/core` (Vue wrapper for Three.js) — rejected because it adds an abstraction layer that makes the comet trail ring-buffer pattern harder to implement efficiently, and the docs are less mature.
- `Babylon.js` — more opinionated, heavier bundle, less community precedent for Vue integration.
- `p5.js` (2D) — rejected because the spec requires a 3D solar system.

### No SSR

`ssr: false` for the whole app. Three.js needs `window`/WebGL, the scanner needs the camera, and the teacher's Supabase session lives in `localStorage` — so the server could not render any page meaningfully or know who is logged in. The route middleware (`app/middleware/auth.ts`) therefore runs in the browser only, after the Supabase plugin has restored the session.

### No labels in the 3D scene

Planets carry no text. Names and student numbers appear only in the attendee panel beside the scene. For scanned planets the name is the attendee's `username`; the database writes the student number there only while the Sun's `show_student_numbers` setting is on (the default), so hidden numbers never reach the public page.

---

## Animation: Comet Trails

**Chosen:** `THREE.Line` + ring-buffer of 48 positions, per-vertex color fade
**Why:** The ring buffer avoids rebuilding the geometry array each frame by overwriting slots in-place. Per-vertex color (via `vertexColors: true`) allows a smooth brightness gradient from tail (dim) to head (bright) without a custom shader. `THREE.AdditiveBlending` makes overlapping trails brighten rather than occlude.
**Alternative considered:** `TubeGeometry` rebuilt each frame — rejected because it re-allocates geometry on every update, causing GC pressure and stuttering at 60fps.
**Alternative considered:** `THREE.Points` with a custom ShaderMaterial — more accurate per-point opacity, but adds shader compilation complexity. Deferred to a future enhancement.

---

## Camera

**Chosen:** `PerspectiveCamera` slowly orbiting the Y axis (`cameraAngle += dt * 0.04`)
**Why:** Gives a continuous 3D perspective without requiring user interaction. The solar system is a display (wall screen / projector) not an interactive model.
**No OrbitControls:** Deliberately omitted. The system is meant for passive viewing — no mouse control.

---

## Database: Supabase (PostgreSQL)

**Chosen:** Supabase with `@supabase/supabase-js` v2
**Why:** Provides PostgreSQL (reliable, relational), Row Level Security, Realtime via WebSockets, and hosted infrastructure with no ops overhead. The free tier is sufficient for event-scale usage.
**Schema design choices:**
- The schema lives in `supabase/migrations/` (one baseline migration); apply with `supabase db push`.
- `suns` are owned by a teacher (`owner_id`, Supabase Auth). A Sun doubles as a scanner session.
- `scans` holds one row per student per direction (`enter` / `leave`) with the scan time and the answer (`mood` on enter, `rating` on leave). A unique constraint makes a repeated scan overwrite the earlier one.
- `attendees` are the public planet rows. `source = 'qr'` rows are self-joined via QR code; `source = 'scan'` rows are created and removed by `record_scan()` when a student is scanned in or out.
- QR attendees prove ownership with a `session_token` UUID kept in `sessionStorage`; heartbeat and leave go through `security definer` RPCs.
- Planet parameters for QR joins are picked client-side (`useJoin.ts`); for scans in SQL (`record_scan()`), using the same palette and ranges.

---

## Realtime: Supabase `postgres_changes`

**Chosen:** Supabase Realtime `postgres_changes` on the `attendees` and `scans` tables, filtered by `sun_id`
**Why:** Row-level CDC (Change Data Capture) — the attendees store patches itself on INSERT/UPDATE/DELETE without polling. Each Sun view subscribes to exactly the rows it cares about. The scans store does the same for the owner, so the list on a laptop follows the phone that is scanning.
**Alternative considered:** Supabase Presence (ephemeral, in-memory) — rejected because presence doesn't persist join data (color, orbit parameters) which must survive page refresh.

---

## State Management: Pinia (Options API)

**Chosen:** Pinia options API stores (`useAuthStore`, `useSunStore`, `useAttendeesStore`, `useScansStore`)
**Why:** Options API style matches the `fisc` project conventions. The `attendees` store is the single source of truth for the live attendee list, patched in real time. Colocation of the Supabase subscription channel inside the store simplifies cleanup.

---

## Barcode Scanner

**Chosen:** `barcode-detector` ponyfill (ZXing-C++ compiled to WebAssembly) on a `getUserMedia` video stream, wrapped in `useBarcodeScanner`
**Why:** The native `BarcodeDetector` API is missing in iOS Safari, and the scanner must run on the teacher's phone. The ponyfill behaves the same on every browser. The `.wasm` file is bundled (`zxing-wasm`, version pinned to match) rather than fetched from a CDN.
**Behaviour:**
- Only 1D formats are enabled (Code 128/39/93, Codabar, ITF, EAN, UPC) — faster and fewer false reads.
- A value must be read twice in a row before it counts, and the same barcode only counts again after 4 seconds out of view. Without this a card held in front of the camera would re-scan continuously and wipe the answer just given.
- The scanner never stops: the answer panel under the camera belongs to the latest scan and the next scan replaces it.
- Requires a secure context (HTTPS or localhost). `npm run dev:phone` serves the dev server over HTTPS on the local network.
**Alternatives considered:** `html5-qrcode` (unmaintained), native `BarcodeDetector` only (no iOS support).

---

## Idle Detection

**Chosen:** Client-side event listeners (`mousemove`, `keydown`, `click`, `touchstart`, `scroll`) + `setTimeout` (9 minutes), backed by server `pg_cron` cleanup at 10 minutes
**Why:** Two-layer approach:
1. Client proactively calls `leave_sun` RPC when idle, keeping the 3D scene accurate.
2. Server `pg_cron` job handles closed tabs, network drops, crashed browsers.
Applies to QR attendees only: scanned planets have no heartbeat and stay until the student is scanned out.
The 1-minute gap between client (9min) and server (10min) avoids a race where the server deletes a row the client is about to "voluntarily" delete.

---

## QR Codes: `qrcode` npm package

**Chosen:** `qrcode` v1.5.4
**Why:** Lightweight (no canvas dependency issues in Vite), produces data URLs directly, supports error correction level configuration. Used client-side only.
**Alternative considered:** `vue-qrcode-component` — adds a Vue-specific dependency for something easily wrapped in a one-file composable.

---

## Styling: Tailwind CSS

**Chosen:** `@nuxtjs/tailwindcss` + custom space theme
**Why:** Utility-first approach allows rapid dark-space UI without custom CSS files. Custom colors (`space-950`, `sun`) extend the theme. Glass-morphism components (`glass-panel`) defined as `@layer components` for reuse.

---

## URL / Slug Design

**Pattern:** `{name-kebab-case}-{base36-timestamp}`
**Example:** `team-standup-1742169600` → `team-standup-m5fqo0`
**Why:** Human-readable (the name is visible in the QR URL), guaranteed unique (timestamp suffix), URL-safe.

---

## Security Model

Teachers log in (Supabase Auth, email + password). Joining via QR stays anonymous and frictionless.
Security properties, all enforced in the database (`supabase/migrations/`):
- **Suns:** readable and writable by their owner only. Anonymous visitors cannot list Suns; the live view and join page fetch one by exact slug through the `get_sun_by_slug` RPC, so the slug acts as the share link.
- **Scans (student numbers, times, answers):** owner only. Rows are created through `record_scan()`, which checks ownership.
- **Planets (`attendees`):** publicly readable — they are what the wall screen renders — but `email`, `student_number` and `session_token` are excluded by column-level grants for every client role. The owner reads emails through the `get_attendee_emails` RPC.
- **Student numbers on the live view:** shown by default; the owner can switch them off per Sun (`show_student_numbers`). While on, the number is the planet's public name in the attendee panel, and anyone with the live link can read it. While off, the number never reaches the public page.
- **QR attendees:** ownership via a session token (UUID v4) in `sessionStorage`; heartbeat and leave require it via RPC. Only the Sun owner can remove other planets.
- **No CSRF risk:** All mutations use the Supabase client (JSON over HTTPS), not form submissions.

---

## File Structure

```
solsystem/
├── app/
│   ├── app.vue
│   ├── assets/css/main.css
│   ├── components/
│   │   ├── AttendeePanel.vue        # Sidebar overlay on live view
│   │   ├── ConfirmModal.vue         # Generic confirm dialog
│   │   ├── JoinForm.vue             # Username + email form
│   │   ├── JoinQr.vue               # Resizable join QR on the live view
│   │   ├── QrCodeDisplay.vue        # QR rendering + download
│   │   ├── ScanList.vue             # Scanned students: in/out time + answer
│   │   ├── SunCard.vue              # Card on index page
│   │   ├── SunCreateModal.vue       # Create Sun modal
│   │   └── scene/
│   │       ├── SolarScene.vue       # Vue wrapper for Three.js canvas
│   │       ├── useSolarScene.ts     # Scene setup, animation loop
│   │       ├── usePlanetMeshes.ts   # Planet lifecycle + orbit update
│   │       └── useCometTrails.ts    # Trail ring-buffer renderer
│   ├── composables/
│   │   ├── useSupabase.ts           # Supabase client accessor
│   │   ├── useJoin.ts               # Join flow + planet params
│   │   ├── useHeartbeat.ts          # Idle detection + heartbeat
│   │   ├── useBarcodeScanner.ts     # Camera stream + barcode detection loop
│   │   └── useQrCode.ts             # QR data URL generator
│   ├── layouts/
│   │   ├── default.vue              # Full-screen dark (3D, scanner, login)
│   │   └── manage.vue               # Nav + max-width (teacher pages)
│   ├── middleware/auth.ts           # Redirects to /login when not logged in
│   ├── pages/
│   │   ├── index.vue                # Teacher's Suns (login required)
│   │   ├── login.vue                # Teacher login / sign-up
│   │   ├── join/[slug].vue          # QR landing + join form (public)
│   │   ├── sun/[slug].vue           # Live 3D view (public)
│   │   ├── scan/index.vue           # New session or reopen one
│   │   ├── scan/[id].vue            # Barcode scanner + answers + list
│   │   └── manage/[id].vue          # Sun management + scanned list
│   ├── plugins/supabase.client.ts   # Supabase singleton + session restore
│   ├── stores/
│   │   ├── auth.ts                  # Logged-in teacher
│   │   ├── sun.ts                   # Sun CRUD + current sun
│   │   ├── attendees.ts             # Planet list + realtime
│   │   └── scans.ts                 # Scans of a session + realtime
│   ├── types/index.ts               # Shared TypeScript interfaces
│   └── utils/
│       ├── format.ts                # Date/time formatting
│       ├── orbits.ts                # Ring radii
│       └── scanOptions.ts           # Mood and rating options
├── supabase/
│   ├── config.toml
│   └── migrations/                  # Database schema (supabase db push)
├── .env.example
├── nuxt.config.ts
├── tailwind.config.ts
├── spec.md                          # Product specification
└── agents.md                        # This file
```
