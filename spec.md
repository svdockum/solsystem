# SolSystem — Product Specification

## Overview

SolSystem is an attendee registration and engagement system that turns event participation into a live 3D solar system. Each event is a **Sun**. Each participant becomes a uniquely colored **planet** that orbits the Sun with a glowing comet trail. Participants join by scanning a QR code, entering a username, and optionally an email address.

---

## Functional Requirements

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
| Planet size | 0.4 – 1.2 (Three.js units) | `Math.random()` |
| Orbit radius | 4 – 18 (slot-based, 1.6 spacing) | Find first unused slot |
| Orbit speed | 0.05 – 0.2 rad/s | `Math.random()` |
| Orbit phase | 0 – 2π | `Math.random()` (initial angle) |

### Idle / Presence Management

| Mechanism | Interval | Action |
|---|---|---|
| Heartbeat RPC | Every 60 seconds | Updates `last_heartbeat` in DB |
| Client idle timeout | 9 minutes of no user activity | Calls `leave_sun` RPC, redirects to join page |
| Server cleanup | Every 1 minute (pg_cron) | Deletes rows where `last_heartbeat < now() - 10min` |
| Voluntary leave | "Leave orbit" button | Calls `leave_sun` RPC, navigates home |

The two-layer approach (client 9min + server 10min) ensures stale planets are cleared even when users close their tab without triggering the beforeunload event.

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
- Lists all current planets with color dot, username, optional email, time since joining
- `<TransitionGroup>` slide animation for join/leave events
- "Join this Sun" link for viewers who haven't joined yet (opens in new tab)

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

| Route | Purpose | SSR |
|---|---|---|
| `/` | Directory of active Suns + create | Yes |
| `/join/[slug]` | QR-code landing page, join form | No |
| `/sun/[slug]` | Live 3D solar system view | No |
| `/manage/[id]` | Sun management: QR, attendees, deactivate | Yes |

---

## Database Schema

```
suns
  id, name, slug (unique), description, is_active, created_at, updated_at

attendees
  id, sun_id → suns.id, username, email, color, planet_size, orbit_radius,
  orbit_speed, orbit_phase, last_heartbeat, joined_at, session_token (unique)
```

All write operations (heartbeat, leave) go through `security definer` RPC functions that accept the session token as a parameter. This avoids needing user authentication while still providing ownership proof.

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
