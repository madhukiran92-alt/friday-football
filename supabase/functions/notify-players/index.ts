import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// The client sends only an event type + game id. Recipients and message
// content are derived server-side so a malicious caller can't spam
// arbitrary users with arbitrary text.
interface NotifyPayload {
  type: 'game_cancelled' | 'waitlist_promoted' | 'added_to_game';
  game_id: string;
  /** waitlist_promoted: the promoted player. added_to_game: the pre-added players. */
  recipient_ids?: string[];
}

serve(async (req) => {
  try {
    const payload: NotifyPayload = await req.json();
    const { type, game_id, recipient_ids } = payload;

    if (!type || !game_id) {
      return new Response(JSON.stringify({ error: 'type and game_id required' }), { status: 400 });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Identify the caller from their JWT (verify_jwt already validated it).
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'unauthorised' }), { status: 401 });
    }
    const callerId = userData.user.id;

    const { data: game } = await admin
      .from('games')
      .select('id, title')
      .eq('id', game_id)
      .single();
    if (!game) {
      return new Response(JSON.stringify({ error: 'game not found' }), { status: 404 });
    }

    const { data: regs } = await admin
      .from('registrations')
      .select('profile_id, status')
      .eq('game_id', game_id);
    const registeredIds = new Set((regs ?? []).map((r) => r.profile_id));

    const { data: adminRow } = await admin
      .from('admins')
      .select('id')
      .eq('profile_id', callerId)
      .maybeSingle();
    const callerIsAdmin = !!adminRow;

    // Authorise + resolve recipients + build the message per event type.
    let targets: string[] = [];
    let title = '';
    let body = '';

    switch (type) {
      case 'game_cancelled':
        // Only admins cancel games; notify everyone registered except the caller.
        if (!callerIsAdmin) {
          return new Response(JSON.stringify({ error: 'admin only' }), { status: 403 });
        }
        targets = [...registeredIds].filter((id) => id !== callerId);
        title = '❌ Game cancelled';
        body = `"${game.title}" has been cancelled.`;
        break;

      case 'added_to_game':
        // Only admins pre-add players; recipients must actually be registered.
        if (!callerIsAdmin) {
          return new Response(JSON.stringify({ error: 'admin only' }), { status: 403 });
        }
        targets = (recipient_ids ?? []).filter((id) => registeredIds.has(id));
        title = '📅 You\'ve been added to a game';
        body = game.title;
        break;

      case 'waitlist_promoted': {
        // Any registered player leaving can trigger this, but the recipient
        // must genuinely hold a confirmed spot in this game.
        const promoted = recipient_ids?.[0];
        const isConfirmed = (regs ?? []).some(
          (r) => r.profile_id === promoted && r.status === 'confirmed',
        );
        if (!promoted || !isConfirmed) {
          return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
        }
        targets = [promoted];
        title = '🎉 You\'re in!';
        body = `A spot opened up in "${game.title}" — you're confirmed!`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'unknown type' }), { status: 400 });
    }

    if (!targets.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const { data: rows } = await admin
      .from('push_tokens')
      .select('token')
      .in('profile_id', targets);

    const tokens = (rows ?? []).map((r) => r.token).filter(Boolean);
    if (!tokens.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    let sent = 0;
    for (let i = 0; i < tokens.length; i += 100) {
      const batch = tokens.slice(i, i + 100);
      const messages = batch.map((token) => ({
        to: token,
        title,
        body,
        data: { game_id },
        sound: 'default',
      }));
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
      if (res.ok) sent += batch.length;
    }

    return new Response(JSON.stringify({ sent }), { status: 200 });
  } catch (err) {
    console.error('notify-players error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
