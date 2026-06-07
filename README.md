# Pitch

Organise, join and play recreational sport with your crew.

Pitch is a mobile app (iOS + Android) for managing casual sports games — create a game, invite players, handle the waitlist automatically, and generate balanced teams. Built for any sport: football, basketball, cricket, tennis, and more.

---

## Features

- **Multi-sport** — football, basketball, cricket, tennis, rugby, volleyball and more
- **Game feed** — see all upcoming games, capacity bar, and who's playing
- **Join / leave** — one tap to join a game or the waitlist if it's full
- **Waitlist** — automatic promotion when a spot opens, handled atomically server-side
- **Team generation** — balanced random splits, saved per game
- **Admin system** — invite-only admin accounts via one-time codes
- **Admin portal** — create/edit games, manage players, generate teams, manage admins
- **Real-time updates** — player list syncs live as people join or leave
- **Bottom tab navigation** — instant switching between Games and Admin views

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
│   │   ├── lib/                 # Supabase client, theme constants, types
│   │   └── components/          # ErrorBoundary
│   └── assets/                  # App icon, splash screen
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

Key RPCs (all `SECURITY DEFINER`):

| Function | Purpose |
|---|---|
| `join_game(p_game_id)` | Atomic join with waitlist logic and row-level locking |
| `leave_game(p_registration_id)` | Remove player and promote first waitlisted user |
| `redeem_admin_invite(p_code)` | Validate and consume a one-time invite code |
| `is_admin()` | Returns true if the calling user is in the `admins` table |

---

## Security

- **RLS enabled** on all 7 public tables
- **Anon key only** in the client — `service_role` never leaves the server
- **Phone/email protected** — `profiles_public` view masks other users' contact details; only your own phone/email is returned. Column-level `SELECT` revoked on base table for `authenticated` role.
- **Waitlist integrity** — direct `UPDATE`/`DELETE` on `registrations` restricted to admins; players must go through `join_game`/`leave_game` RPCs so queue logic always runs atomically
- **Admin invite codes** — single-use, row-locked on redemption to prevent race conditions
- **Error boundary** — catches unexpected render errors app-wide

---

## Distribution

- **iOS** — `eas build --platform ios`, distribute via TestFlight or App Store
- **Android** — `eas build --platform android`, share APK directly or publish to Play Store

---

## Roadmap

- Push notifications (game created, confirmed off waitlist, game cancelled)
- Offline / network error states
- Privacy Policy + Terms of Service screen
- Recurring games
- Player stats

---

## Licence

MIT
