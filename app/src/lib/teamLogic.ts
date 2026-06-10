/** Fisher–Yates shuffle. `rng` is injectable for deterministic tests. */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Randomly split players into two teams. With an odd count the first
 * team gets the extra player. Throws if there are fewer than 2 players.
 */
export function splitIntoTeams<T>(players: T[], rng: () => number = Math.random): [T[], T[]] {
  if (players.length < 2) {
    throw new Error('Need at least 2 players to make teams');
  }
  const shuffled = shuffle(players, rng);
  const half = Math.ceil(shuffled.length / 2);
  return [shuffled.slice(0, half), shuffled.slice(half)];
}
