jest.mock('../supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

import { supabase } from '../supabase';
import { notifyGameEvent } from '../notifications';

const mockInvoke = supabase.functions.invoke as jest.Mock;

describe('notifyGameEvent', () => {
  beforeEach(() => mockInvoke.mockReset());

  it('sends a game_cancelled event with no recipients (server resolves them)', async () => {
    mockInvoke.mockResolvedValue({ data: { sent: 3 } });
    await notifyGameEvent('game_cancelled', 'game-1');
    expect(mockInvoke).toHaveBeenCalledWith('notify-players', {
      body: { type: 'game_cancelled', game_id: 'game-1', recipient_ids: undefined },
    });
  });

  it('sends waitlist_promoted with the promoted player id', async () => {
    mockInvoke.mockResolvedValue({ data: { sent: 1 } });
    await notifyGameEvent('waitlist_promoted', 'game-2', ['lucky-player']);
    expect(mockInvoke).toHaveBeenCalledWith('notify-players', {
      body: { type: 'waitlist_promoted', game_id: 'game-2', recipient_ids: ['lucky-player'] },
    });
  });

  it('sends added_to_game with the pre-added player ids', async () => {
    mockInvoke.mockResolvedValue({ data: { sent: 2 } });
    await notifyGameEvent('added_to_game', 'game-3', ['p1', 'p2']);
    expect(mockInvoke).toHaveBeenCalledWith('notify-players', {
      body: { type: 'added_to_game', game_id: 'game-3', recipient_ids: ['p1', 'p2'] },
    });
  });

  it('swallows network failures — notifications never block the user action', async () => {
    mockInvoke.mockRejectedValue(new Error('network down'));
    await expect(notifyGameEvent('game_cancelled', 'game-4')).resolves.toBeUndefined();
  });
});
