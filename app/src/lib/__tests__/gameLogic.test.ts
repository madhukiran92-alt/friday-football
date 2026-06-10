import {
  buildRegistrationRows,
  enrichGames,
  groupRegistrationsByGame,
  splitRegistrations,
  waitlistPosition,
} from '../gameLogic';
import { makeGame, makeProfile, makeReg } from './fixtures';

describe('splitRegistrations', () => {
  const regs = [
    makeReg('g1', 'alice', 'confirmed', 1),
    makeReg('g1', 'bob', 'confirmed', 2),
    makeReg('g1', 'carol', 'waitlist', 3),
  ];

  it('separates confirmed players from the waitlist', () => {
    const { confirmed, waitlist } = splitRegistrations(regs);
    expect(confirmed.map(r => r.profile_id)).toEqual(['alice', 'bob']);
    expect(waitlist.map(r => r.profile_id)).toEqual(['carol']);
  });

  it('finds the viewer\'s own registration', () => {
    const { myReg } = splitRegistrations(regs, 'bob');
    expect(myReg?.profile_id).toBe('bob');
  });

  it('returns null myReg when the viewer is not registered', () => {
    const { myReg } = splitRegistrations(regs, 'dave');
    expect(myReg).toBeNull();
  });

  it('returns null myReg when no viewer id is given', () => {
    const { myReg } = splitRegistrations(regs);
    expect(myReg).toBeNull();
  });
});

describe('groupRegistrationsByGame', () => {
  it('buckets registrations by game and preserves order', () => {
    const regs = [
      makeReg('g1', 'alice', 'confirmed', 1),
      makeReg('g2', 'bob', 'confirmed', 1),
      makeReg('g1', 'carol', 'waitlist', 2),
    ];
    const byGame = groupRegistrationsByGame(regs);
    expect(byGame.get('g1')!.map(r => r.profile_id)).toEqual(['alice', 'carol']);
    expect(byGame.get('g2')!.map(r => r.profile_id)).toEqual(['bob']);
  });
});

describe('enrichGames', () => {
  it('attaches each game\'s registrations and the viewer\'s own', () => {
    const games = [makeGame({ id: 'g1' }), makeGame({ id: 'g2', title: 'Lunch Hoops' })];
    const regs = [
      makeReg('g1', 'alice', 'confirmed', 1),
      makeReg('g1', 'me', 'waitlist', 2),
      makeReg('g2', 'bob', 'confirmed', 1),
    ];

    const [g1, g2] = enrichGames(games, regs, 'me');

    expect(g1.confirmed).toHaveLength(1);
    expect(g1.waitlist).toHaveLength(1);
    expect(g1.myReg?.profile_id).toBe('me');

    expect(g2.confirmed.map(r => r.profile_id)).toEqual(['bob']);
    expect(g2.waitlist).toHaveLength(0);
    expect(g2.myReg).toBeNull();
  });

  it('handles games with no registrations at all', () => {
    const [game] = enrichGames([makeGame({ id: 'empty' })], [], 'me');
    expect(game.confirmed).toEqual([]);
    expect(game.waitlist).toEqual([]);
    expect(game.myReg).toBeNull();
  });
});

describe('waitlistPosition', () => {
  const waitlist = [
    makeReg('g1', 'first', 'waitlist', 3, { id: 'reg-first' }),
    makeReg('g1', 'second', 'waitlist', 4, { id: 'reg-second' }),
  ];

  it('is 1-based', () => {
    expect(waitlistPosition(waitlist, 'reg-first')).toBe(1);
    expect(waitlistPosition(waitlist, 'reg-second')).toBe(2);
  });

  it('returns 0 for a registration not on the waitlist', () => {
    expect(waitlistPosition(waitlist, 'reg-ghost')).toBe(0);
  });
});

describe('buildRegistrationRows', () => {
  const admin = makeProfile({ id: 'admin', name: 'The Admin' });

  it('puts the admin first as confirmed player #1', () => {
    const rows = buildRegistrationRows(admin, [], 'g1', 14);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      profile_id: 'admin',
      status: 'confirmed',
      position: 1,
      added_by: 'admin',
      game_id: 'g1',
    });
  });

  it('confirms players up to max and waitlists the overflow', () => {
    const others = ['p1', 'p2', 'p3'].map(id => makeProfile({ id }));
    const rows = buildRegistrationRows(admin, others, 'g1', 3);

    expect(rows.map(r => r.status)).toEqual(['confirmed', 'confirmed', 'confirmed', 'waitlist']);
    expect(rows.map(r => r.position)).toEqual([1, 2, 3, 4]);
  });

  it('drops a duplicate of the admin from the others list', () => {
    const others = [makeProfile({ id: 'admin' }), makeProfile({ id: 'p1' })];
    const rows = buildRegistrationRows(admin, others, 'g1', 14);
    expect(rows.map(r => r.profile_id)).toEqual(['admin', 'p1']);
  });

  it('handles max players of 1: only the admin is confirmed', () => {
    const others = [makeProfile({ id: 'p1' })];
    const rows = buildRegistrationRows(admin, others, 'g1', 1);
    expect(rows[0].status).toBe('confirmed');
    expect(rows[1].status).toBe('waitlist');
  });
});
