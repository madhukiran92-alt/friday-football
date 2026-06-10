# Pitch

Organise, join and play recreational sport with your crew.

Pitch is a mobile app (iOS + Android) for managing casual sports games — create a game, invite players, handle the waitlist automatically, and generate balanced teams. Built for any sport: football, basketball, cricket, tennis, and more.

---

## Features

- **Multi-sport** — football, basketball, cricket, tennis, rugby, volleyball and more
- **Game feed** — see all upcoming games, capacity bar, and who's playing
- **Join / leave** — one tap to join a game or the waitlist if it's full
- **Waitlist** — automatic promotion when a spot opens, handled atomically server-side
- **Push notifications** — players notified when added to a game, confirmed off the waitlist, or a game is cancelled
- **Offline error states** — clear "Can't connect" screen with retry instead of a silent empty list
- **Team generation** — balanced random splits, saved per game
- **Single-door admin accounts** — organiser accounts are created only on the website ([pitchapp.net/admin](https://pitchapp.net/admin/)) with a one-time invite code; the app's signup creates players only. Built so the web gate can later become a paid checkout without app changes.
- **Admin portal** — create/edit games, manage players, generate teams, manage admins
- **Real-time updates** — player list syncs live as people join or leave
- **Bottom tab navigation** — instant switching between Games and Admin views
- **Privacy Policy + Terms of Service** — in-app legal screen linked from profile and sign-up consent line

---

## Tech stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo SDK 56 |
| Routing | Expo Router v4 (file-based) |
| Backend | Supabase (Postgres, Auth, RLS, Realtime) |
| Language | TypeScript |
| Builds | EAS Build |

---

## Getting started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/madhukiran92-alt/friday-football.git
cd friday-football/app
npm install
```

### 2. Configure environment

Create `app/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run

```bash
npx expo start       # Expo dev server — scan QR with Expo Go
npx expo run:ios     # iOS simulator
npx expo run:android # Android emulator
```

---

## Project structure

```
friday-football/
├── app/
│   ├── app/
│   │   ├── (auth)/              # Login + name/invite onboarding
│   │   └── (app)/               # Authenticated screens
│   │       ├── home.tsx         # Game feed (players)
│   │       ├── profile.tsx      # User profile
│   │       ├── teams.tsx        # Team viewer
│   │       └── admin/           # Admin portal
│   │           ├── index.tsx    # Dashboard with stats + game picker
│   │           ├── create-game.tsx
│   │           ├── edit-game.tsx
│   │           ├── manage-game.tsx
│   │           ├── generate-teams.tsx
│   │           └── manage-admins.tsx
│   ├── src/
│   │   ├── context/             # AuthContext (session, profile, isAdmin)
│   │   ├── hooks/               # usePushNotifications
│   │   ├── lib/                 # Supabase client, theme constants, types, notifications
│   │   └── components/          # ErrorBoundary, NetworkError
│   └── assets/                  # App icon, splash screen
├── supabase/
│   └── functions/
│       ├── notify-players/        # Edge function — sends Expo push notifications
│       └── create-admin-account/  # Edge function — web organiser signup (invite-gated)
├── landing/                       # pitchapp.net (Cloudflare Pages)
│   ├── index.html                 # Landing page
│   └── admin/index.html           # Organiser account signup
```

---

## Database

Key tables:

| Table | Purpose |
|---|---|
| `profiles` | User display names (linked to `auth.users`) |
| `games` | Game details — title, sport, location, date, max players, status |
| `registrations` | Player sign-ups with confirmed / waitlist status and position |
| `admins` | Admin role assignments |
| `admin_invites` | One-time codes for granting admin access |
| `teams` + `team_members` | Generated team assignments per game |
| `push_tokens` | Device push tokens per user (one per device) |

Key RPCs (all `SECURITY DEFINER`):

| Function | Purpose |
|---|---|
| `join_game(p_game_id)` | Atomic join with waitlist logic and row-level locking |
| `leave_game(p_registration_id)` | Remove player, promote first waitlisted user, return promoted `profile_id` |
| `redeem_admin_invite(p_code)` | Validate and consume a one-time invite code |
| `is_admin()` | Returns true if the calling user is in the `admins` table |

---

## Testing

```bash
cd app
npm test           # Jest unit tests (game logic, teams, invite codes, notifications)
npm run typecheck  # TypeScript strict check
```

- **Unit tests** live in `app/src/lib/__tests__/` with mock-data factories in `fixtures.ts`. They cover waitlist splitting, registration position/status assignment, balanced team generation, invite-code format, and notification payloads.
- **DB integration test**: [`supabase/tests/waitlist_rpc_test.sql`](supabase/tests/waitlist_rpc_test.sql) exercises `join_game`, `leave_game`, and `redeem_admin_invite` against the real schema with simulated JWTs. Paste it into the Supabase SQL editor — it creates throwaway users, runs 7 assertions, and always rolls itself back. Success looks like `ERROR: TEST_SUITE_PASSED`.
- **CI**: GitHub Actions runs typecheck + tests on every push and pull request.

---

## Security

- **RLS enabled** on all 7 public tables
- **Anon key only** in the client — `service_role` never leaves the server
- **Phone/email protected** — `profiles_public` view masks other users' contact details; only your own phone/email is returned. Column-level `SELECT` revoked on base table for `authenticated` role.
- **Waitlist integrity** — direct `UPDATE`/`DELETE` on `registrations` restricted to admins; players must go through `join_game`/`leave_game` RPCs so queue logic always runs atomically
- **Admin invite codes** — single-use, row-locked on redemption to prevent race conditions
- **Error boundary** — catches unexpected render errors app-wide
- **Push tokens** — stored per-user with own-row RLS; read server-side by Edge Function using `service_role`

---

## Distribution

- **iOS** — `eas build --platform ios`, distribute via TestFlight or App Store
- **Android** — `eas build --platform android`, share APK directly or publish to Play Store

---

## Company

Pitch is a product of **Nila** — [pitchapp.net](https://pitchapp.net)

---

## Roadmap

- Recurring games
- Player stats

---

## Licence

MIT
