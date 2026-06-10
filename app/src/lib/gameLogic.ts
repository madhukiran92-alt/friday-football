import { Game, Profile, Registration, RegistrationStatus } from './types';

export type GameWithRegs = Game & {
  confirmed: Registration[];
  waitlist: Registration[];
  myReg: Registration | null;
};

/** Group a flat list of registrations by their game_id. */
export function groupRegistrationsByGame(regs: Registration[]): Map<string, Registration[]> {
  const byGame = new Map<string, Registration[]>();
  for (const r of regs) {
    const list = byGame.get(r.game_id) ?? [];
    list.push(r);
    byGame.set(r.game_id, list);
  }
  return byGame;
}

/** Split one game's registrations into confirmed/waitlist and find the viewer's own. */
export function splitRegistrations(regs: Registration[], profileId?: string) {
  return {
    confirmed: regs.filter(r => r.status === 'confirmed'),
    waitlist: regs.filter(r => r.status === 'waitlist'),
    myReg: profileId ? (regs.find(r => r.profile_id === profileId) ?? null) : null,
  };
}

/** Combine games with their registrations into the shape the UI renders. */
export function enrichGames(
  games: Game[],
  regs: Registration[],
  profileId?: string,
): GameWithRegs[] {
  const byGame = groupRegistrationsByGame(regs);
  return games.map(game => ({
    ...game,
    ...splitRegistrations(byGame.get(game.id) ?? [], profileId),
  }));
}

/** 1-based position of a registration within the waitlist, or 0 if absent. */
export function waitlistPosition(waitlist: Registration[], registrationId: string): number {
  return waitlist.findIndex(r => r.id === registrationId) + 1;
}

export type NewRegistrationRow = {
  game_id: string;
  profile_id: string;
  status: RegistrationStatus;
  position: number;
  added_by: string;
};

/**
 * Build the registration rows for a new game: the creating admin is always
 * player #1, the first `maxPlayers` are confirmed, the rest waitlisted.
 * Duplicates of the admin in `others` are dropped.
 */
export function buildRegistrationRows(
  admin: Profile,
  others: Profile[],
  gameId: string,
  maxPlayers: number,
): NewRegistrationRow[] {
  const players = [admin, ...others.filter(p => p.id !== admin.id)];
  return players.map((p, i) => ({
    game_id: gameId,
    profile_id: p.id,
    status: (i < maxPlayers ? 'confirmed' : 'waitlist') as RegistrationStatus,
    position: i + 1,
    added_by: admin.id,
  }));
}
