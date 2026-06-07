import { supabase } from './supabase';

/**
 * Fire-and-forget push notification.
 * Calls the notify-players Edge Function with the caller's JWT.
 * Silently swallows errors — notifications are best-effort.
 */
export async function notifyPlayers(
  profileIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  if (!profileIds.length) return;
  try {
    await supabase.functions.invoke('notify-players', {
      body: { profile_ids: profileIds, title, body, data },
    });
  } catch {
    // Best-effort — never let a notification failure block the user action
  }
}
