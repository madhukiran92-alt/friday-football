import { Game, Profile, Registration, RegistrationStatus } from '../types';

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  const id = overrides.id ?? nextId('profile');
  return {
    id,
    name: `Player ${id}`,
    phone: null,
    email: `${id}@test.local`,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: overrides.id ?? nextId('game'),
    title: 'Saturday Footy',
    location: 'Victoria Park',
    scheduled_at: '2026-06-13T09:00:00Z',
    max_players: 14,
    status: 'open',
    created_by: 'admin-1',
    created_at: '2026-06-01T00:00:00Z',
    sport: 'football',
    ...overrides,
  };
}

export function makeReg(
  gameId: string,
  profileId: string,
  status: RegistrationStatus,
  position: number,
  overrides: Partial<Registration> = {},
): Registration {
  return {
    id: overrides.id ?? nextId('reg'),
    game_id: gameId,
    profile_id: profileId,
    status,
    position,
    added_by: null,
    created_at: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}
