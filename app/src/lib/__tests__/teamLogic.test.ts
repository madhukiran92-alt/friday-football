import { shuffle, splitIntoTeams } from '../teamLogic';

/** Deterministic rng for reproducible shuffles. */
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

describe('shuffle', () => {
  it('keeps every element exactly once', () => {
    const input = ['a', 'b', 'c', 'd', 'e'];
    const out = shuffle(input, seededRng(42));
    expect([...out].sort()).toEqual([...input].sort());
  });

  it('does not mutate the input array', () => {
    const input = [1, 2, 3];
    shuffle(input, seededRng(7));
    expect(input).toEqual([1, 2, 3]);
  });

  it('is deterministic with an injected rng', () => {
    const a = shuffle([1, 2, 3, 4, 5], seededRng(1));
    const b = shuffle([1, 2, 3, 4, 5], seededRng(1));
    expect(a).toEqual(b);
  });
});

describe('splitIntoTeams', () => {
  it('assigns every player to exactly one team', () => {
    const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    const [t1, t2] = splitIntoTeams(players, seededRng(99));
    expect([...t1, ...t2].sort()).toEqual([...players].sort());
    expect(t1.filter(p => t2.includes(p))).toHaveLength(0);
  });

  it('splits an even count evenly', () => {
    const [t1, t2] = splitIntoTeams(['a', 'b', 'c', 'd'], seededRng(3));
    expect(t1).toHaveLength(2);
    expect(t2).toHaveLength(2);
  });

  it('gives the extra player to the first team on odd counts', () => {
    const [t1, t2] = splitIntoTeams(['a', 'b', 'c', 'd', 'e'], seededRng(3));
    expect(t1).toHaveLength(3);
    expect(t2).toHaveLength(2);
  });

  it('handles the minimum of 2 players', () => {
    const [t1, t2] = splitIntoTeams(['a', 'b'], seededRng(5));
    expect(t1).toHaveLength(1);
    expect(t2).toHaveLength(1);
  });

  it('throws with fewer than 2 players', () => {
    expect(() => splitIntoTeams(['solo'])).toThrow('at least 2');
    expect(() => splitIntoTeams([])).toThrow('at least 2');
  });
});
