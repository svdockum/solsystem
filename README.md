# solsystem

Attendance as a solar system: a teacher scans student barcodes (or shares a QR code) and every attendee becomes a planet orbiting the session's Sun.

## Setup

```bash
npm install
cp .env.example .env        # fill in the Supabase URL and anon key
supabase db push            # apply supabase/migrations to the linked project
npm run dev
```

The barcode scanner needs the camera, which browsers only allow over HTTPS (or on localhost). To try it on a phone during development:

```bash
npm run dev:phone           # HTTPS dev server reachable on your local network
```

See [spec.md](spec.md) for what the app does and [agents.md](agents.md) for the architecture decisions.
