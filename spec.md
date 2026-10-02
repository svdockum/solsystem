# SolSystem — Product Specification

## Overview

SolSystem is an attendee registration and engagement system that turns event participation into a live 3D solar system. Each event is a **Sun**. Each participant becomes a uniquely colored **planet** that orbits the Sun with a glowing comet trail. A Sun is owned by a teacher, who logs in. Planets arrive in two ways: the teacher scans a student's barcode (student number) with their phone, or a participant joins by scanning a QR code and entering a username.

---

## Functional Requirements

### Teacher login

| Requirement | Detail |
|---|---|
| Account | Email + password (Supabase Auth); sign-up on the login page |
| Protected pages | `/`, `/scan/**`, `/manage/**` redirect to `/login` when not logged in |
| Isolation | A teacher only sees their own Suns, scans and attendee emails |
| Public pages | `/join/[slug]` and `/sun/[slug]` need no login; the slug is the share link |

### Barcode attendance (scanner)

| Requirement | Detail |
|---|---|
| Session | A Sun is a scanner session. `/scan` creates one from a name (e.g. the lesson) or reopens an earlier one |
| Scanner | `/scan/[id]` on the teacher's phone: the camera stays on and reads 1D barcodes (Code 128/39/93, Codabar, ITF, EAN, UPC) |
| Scan feedback | The whole screen flashes bright white on every scan (plus a short vibration where supported) |
| Stored per scan | Student number, direction, date and time (`scanned_at`), answer |
| Enter / Leave switch | A switch in the scanner; its position is remembered on the session. A session holds both an enter and a leave scan per student |
| Enter question | "How is your energy?" — ⚡ Energetic / 🙂 Fine / 😴 Tired |
| Leave question | "How good was it?" — Outstanding / Good / Normal / Could be better / Very boring |
| Answer flow | Buttons appear under the camera for the latest scan. A tap shows a thank-you screen with "Change my answer" to go back. Answering is optional: the next scan takes over the panel |
| Double scan | Scanning the same student again in the same direction overwrites the time and clears the answer |
| Re-scan guard | A barcode is read twice before it counts and only counts again after 4 seconds out of view |
| List | The scanner's List button and the Manage page show every student with in/out time and answers; a student can be removed; a number can be added by hand |
| Planets | An enter scan puts a randomly coloured planet in orbit, named after the student number; a leave scan removes it |
| Student numbers on the live view | The number floats above the planet and appears in the attendee panel. A per-Sun setting on the Manage page (on by default) hides the numbers; planets then show as "Student" |

### Suns (Events)

| Requirement | Detail |
|---|---|
| Create a Sun | Name (required, max 80 chars), description (optional, max 200 chars) |
| Unique slug | Auto-generated from name + timestamp suffix (e.g. `team-standup-1742169600`) |
| Multiple Suns | Unlimited active Suns can coexist |
| Deactivate | Soft-delete via the Manage page; removes from directory |
| Management page | QR code display, live attendee list, deactivation |

### Joining

| Requirement | Detail |
|---|---|
| Entry method | QR code → `/join/[slug]` page |
| Username | Required, max 40 characters |
| Email | Optional |
| Session persistence | `sessionStorage` keyed by `solsystem_token_{sun_id}` |
| Already-joined detection | If a valid token exists for this Sun, redirect to live view |

### Planet Assignment (on join)

| Property | Range | Method |
|---|---|---|
| Color | Curated 25-color palette | Random from list |
| Planet size | 0.35 – 0.90 (Three.js units) | Random |
| Orbit radius | 15 fixed rings, 9.5 – 27.7 | Random ring (planets share rings) |
| Orbit speed | 0.162 – 1.134 rad/s | Random |
| Orbit phase | 0 – 2π | Random (initial angle) |

QR joins pick these in the browser (`useJoin.ts`); scanned students get them from the `record_scan()` database function.

### Idle / Presence Management

| Mechanism | Interval | Action |
|---|---|---|
| Heartbeat RPC | Every 60 seconds | Updates `last_heartbeat` in DB |
| Client idle timeout | 9 minutes of no user activity | Calls `leave_sun` RPC, redirects to join page |
| Server cleanup | Every 1 minute (pg_cron) | Deletes rows where `last_heartbeat < now() - 10min` |
| Voluntary leave | "Leave orbit" button | Calls `leave_sun` RPC, returns to the join page |

The two-layer approach (client 9min + server 10min) ensures stale planets are cleared even when users close their tab without triggering the beforeunload event. This applies to QR attendees only; scanned planets stay until the student is scanned out.

### Live 3D View

| Feature | Implementation |
|---|---|
| Full-screen canvas | Three.js WebGLRenderer occupying 100vw × 100vh |
| Sun object | Glowing sphere (3 layers: core + 2 additive glow spheres) |
| Planets | Sphere per attendee, color matches DB record, entrance/exit scale tween |
| Orbit rings | Faint ring per attendee showing their orbital path |
| Comet trails | Ring-buffer of 48 positions, additive-blended Line with per-vertex fade |
| Camera | Auto-orbiting around Y axis (slow, ~0.04 rad/s) for 3D perspective |
| Star field | 2000 random points in a sphere of radius 80–200 |
| Realtime | Supabase Realtime `postgres_changes` on `attendees` table |

### Attendee Panel

- Fixed sidebar overlay (right side, 280px wide) on the live view
- Lists all current planets with color dot, name (or student number when shown), time since joining
- `<TransitionGroup>` slide animation for join/leave events

### Join QR on the live view

- Shown on the left side of the live view, under the Sun's name
- − / + buttons resize it in steps (96 – 500 px); the size is remembered in the browser
- "Scan to join" opens the join page in a new tab

---

## Non-Functional Requirements

| Requirement | Detail |
|---|---|
| Performance | Three.js capped at 60fps via `requestAnimationFrame`; `setPixelRatio(min(dpr, 2))` |
| Mobile support | Join page (`/join/[slug]`) is fully mobile-optimized (no Three.js) |
| Memory management | All Three.js geometries and materials explicitly `.dispose()`d on planet removal |
| WebGL context | Single canvas; no context limit issues |
| Realtime reconnect | Supabase client handles reconnection; full refetch on reconnect (handled by initial subscribe pattern) |
| Max attendees | No hard limit; orbit radii overflow gracefully beyond slot range |

---

## Page Routes

The app renders client-side only (no SSR).

| Route | Purpose | Login |
|---|---|---|
| `/login` | Teacher login / sign-up | — |
| `/` | The teacher's Suns + create | Yes |
| `/scan` | Start a new scanner session or reopen one | Yes |
| `/scan/[id]` | Barcode scanner, answers, scanned list | Yes |
| `/manage/[id]` | Sun management: scanned list, settings, QR, attendees, deactivate | Yes |
| `/join/[slug]` | QR-code landing page, join form | No |
| `/sun/[slug]` | Live 3D solar system view | No |

---

## Database Schema

```
suns
  id, owner_id → auth.users.id, name, slug (unique), description, is_active,
  show_student_numbers, scan_mode (enter|leave), created_at, updated_at

scans                                   -- private to the Sun's owner
  id, sun_id → suns.id, student_number, direction (enter|leave),
  mood (energetic|fine|tired), rating (outstanding|good|normal|could_be_better|very_boring),
  scanned_at; unique (sun_id, student_number, direction)

attendees                               -- the planets; public except *
  id, sun_id → suns.id, source (qr|scan), username, color, planet_size, orbit_radius,
  orbit_speed, orbit_phase, last_heartbeat, joined_at,
  email*, student_number*, session_token* (unique)
```

The schema is defined in `supabase/migrations/`. Scans are written through the `record_scan` RPC, which also adds or removes the student's planet. QR attendees' heartbeat and leave go through RPCs that take the session token as ownership proof.

---

## QR Code Flow

```
Host creates Sun → /manage/[id] displays QR
  ↓
Attendee scans QR → /join/[slug]
  ↓
Fills in username (+ optional email) → form submits
  ↓
Attendee row inserted → session_token saved to sessionStorage
  ↓
Redirect to /sun/[slug]
  ↓
Planet appears in 3D scene for all viewers (via Supabase Realtime)
  ↓
Heartbeat keeps attendee alive every 60s
  ↓
After 9 min idle: auto-leave → redirect back to /join/[slug]?idle=1
```
