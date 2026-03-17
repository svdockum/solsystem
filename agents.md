# SolSystem — Architecture Decision Record

## Framework: Nuxt 4

**Chosen:** Nuxt 4 with `app/` directory layout
**Why:** Matches the conventions of the companion `fisc` project in this monorepo. Auto-imports composables, components, and pages. SSR can be selectively disabled per route (required for Three.js pages).
**Alternative considered:** Plain Vite + Vue 3 SPA — rejected because Nuxt's routing, auto-imports, and runtime config management reduce boilerplate significantly.

---

## 3D Engine: Three.js

**Chosen:** `three` v0.174 + raw composable wrappers (`useSolarScene`, `usePlanetMeshes`, `useCometTrails`)
**Why:** Three.js is the most mature WebGL library with TypeScript types, wide browser support, and no React dependency. The composable pattern integrates naturally with Vue 3's `onMounted`/`onUnmounted` lifecycle.
**Alternatives considered:**
- `@tresjs/core` (Vue wrapper for Three.js) — rejected because it adds an abstraction layer that makes the comet trail ring-buffer pattern harder to implement efficiently, and the docs are less mature.
- `Babylon.js` — more opinionated, heavier bundle, less community precedent for Vue integration.
- `p5.js` (2D) — rejected because the spec requires a 3D solar system.

### SSR for 3D pages

`routeRules` disables SSR for `/sun/**` and `/join/**`. The solar system page wraps `<SolarScene>` in `<ClientOnly>` as a secondary guard. Three.js accesses `window`, `document`, and WebGL context — none available in Node.js.

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
- `session_token` UUID stored in `sessionStorage` (not a cookie) for ownership proof without auth.
- All mutation operations (heartbeat, leave) use `security definer` RPC functions to avoid exposing the session token in client-side RLS expressions.
- `orbit_radius` assigned client-side using slot-based allocation to minimize DB round trips while avoiding visual collisions.

---

## Realtime: Supabase `postgres_changes`

**Chosen:** Supabase Realtime `postgres_changes` on the `attendees` table, filtered by `sun_id`
**Why:** Row-level CDC (Change Data Capture) — the attendees store patches itself on INSERT/UPDATE/DELETE without polling. Each Sun view subscribes to exactly the rows it cares about.
**Alternative considered:** Supabase Presence (ephemeral, in-memory) — rejected because presence doesn't persist join data (color, orbit parameters) which must survive page refresh.

---

## State Management: Pinia (Options API)

**Chosen:** Pinia options API stores (`useSunStore`, `useAttendeesStore`)
**Why:** Options API style matches the `fisc` project conventions. The `attendees` store is the single source of truth for the live attendee list, patched in real time. Colocation of the Supabase subscription channel inside the store simplifies cleanup.

---

## Idle Detection

**Chosen:** Client-side event listeners (`mousemove`, `keydown`, `click`, `touchstart`, `scroll`) + `setTimeout` (9 minutes), backed by server `pg_cron` cleanup at 10 minutes
**Why:** Two-layer approach:
1. Client proactively calls `leave_sun` RPC when idle, keeping the 3D scene accurate.
2. Server `pg_cron` job handles closed tabs, network drops, crashed browsers.
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

The system has no user authentication by design (event joining should be frictionless).
Security properties:
- **Ownership:** Session token (UUID v4) stored only in `sessionStorage` — not accessible to other tabs or users.
- **Write isolation:** Heartbeat and leave operations require the session token via RPC. No other mutations are exposed.
- **No spoofing:** `session_token` is never returned in `SELECT` queries (excluded from all public queries; a `attendees_public` view is provided for safe reads).
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
│   │   ├── JoinForm.vue             # Username + email form
│   │   ├── QrCodeDisplay.vue        # QR rendering + download
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
│   │   └── useQrCode.ts             # QR data URL generator
│   ├── layouts/
│   │   ├── default.vue              # Full-screen dark (3D pages)
│   │   └── manage.vue               # Nav + max-width (admin pages)
│   ├── pages/
│   │   ├── index.vue                # Sun directory
│   │   ├── join/[slug].vue          # QR landing + join form
│   │   ├── sun/[slug].vue           # Live 3D view
│   │   └── manage/[id].vue          # Sun management
│   ├── plugins/supabase.client.ts   # Supabase singleton plugin
│   ├── stores/
│   │   ├── sun.ts                   # Sun CRUD + current sun
│   │   └── attendees.ts             # Attendee list + realtime
│   └── types/index.ts               # Shared TypeScript interfaces
├── supabase/schema.sql              # Full DB setup script
├── nuxt.config.ts
├── tailwind.config.ts
├── spec.md                          # Product specification
└── agents.md                        # This file
```
