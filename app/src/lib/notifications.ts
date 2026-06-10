import { supabase } from './supabase';

type GameEvent = 'game_cancelled' | 'waitlist_promoted' | 'added_to_game';

/**
 * Fire-and-forget push notification for a game event.
 * The edge function authorises the caller and builds the message
 * server-side — the client only names the event and the game.
 */
export async function notifyGameEvent(
  type: GameEvent,
  gameId: string,
  recipientIds?: string[],
) {
  try {
    await supabase.functions.invoke('notify-players', {
      body: { type, game_id: gameId, recipient_ids: recipientIds },
    });
  } catch {
    // Best-effort — never let a notification failure block the user action
  }
}
