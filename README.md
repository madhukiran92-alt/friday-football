# Friday Football ⚽

A mobile app for organising casual Friday football games. Players can sign up, join games, and see their teams — admins manage everything from creating games to generating balanced teams.

Built with Expo (React Native) and Supabase.

---

## Features

- **Game feed** — see all upcoming games, capacity, and who's playing
- **Join / leave** — one tap to join a game or join the waitlist if it's full
- **Waitlist** — automatic promotion when a spot opens up
- **Teams** — admins generate balanced teams from confirmed players
- **Admin portal** — create and edit games, manage players, add/remove admins
- **Real-time updates** — player list updates live as people join or leave

---

## Tech stack

| Layer | Tech |
|---|---|
| Mobile app | Expo 56 + React Native 0.85 |
| Routing | Expo Router (file-based) |
| Backend | Supabase (Postgres + Auth + Realtime) |
| Auth | Email / password |
| Deployment | EAS Build + TestFlight |

---

## Getting started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- A [Supabase](https://supabase.com) account

### 1. Clone and install

```bash
git clone https://github.com/madhukiran92-alt/friday-football.git
cd friday-football/app
npm install
```

### 2. Set up Supabase

Follow [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) to create your project, run the schema, and enable auth.

### 3. Configure environment

Create `app/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the app

```bash
cd app
npm start          # Expo dev server
npm run ios        # iOS simulator
npm run android    # Android emulator
```

---

## Project structure

```
friday-football/
├── app/
│   ├── app/
│   │   ├── (auth)/          # Login + onboarding screens
│   │   └── (app)/           # Main app screens
│   │       ├── home.tsx     # Game feed
│   │       ├── profile.tsx  # User profile
│   │       ├── teams.tsx    # Team viewer
│   │       └── admin/       # Admin portal
│   ├── src/
│   │   ├── context/         # Auth context
│   │   └── lib/             # Supabase client, types, theme
│   └── assets/
├── supabase/
│   └── schema.sql           # Full database schema
├── SUPABASE_SETUP.md
└── TESTFLIGHT_SETUP.md
```

---

## Contributing

`main` is protected — open a pull request and request a review. Direct pushes are blocked.

---

## Licence

MIT
