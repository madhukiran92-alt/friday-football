import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface NotifyPayload {
  /** profile_ids to notify */
  profile_ids: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  try {
    const payload: NotifyPayload = await req.json();
    const { profile_ids, title, body, data } = payload;

    if (!profile_ids?.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    // Use service role to read push tokens across all users
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: rows, error } = await supabase
      .from('push_tokens')
      .select('token')
      .in('profile_id', profile_ids);

    if (error) throw error;

    const tokens = (rows ?? []).map((r) => r.token).filter(Boolean);
    if (!tokens.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    // Send in batches of 100 (Expo limit)
    const batches: string[][] = [];
    for (let i = 0; i < tokens.length; i += 100) {
      batches.push(tokens.slice(i, i + 100));
    }

    let sent = 0;
    for (const batch of batches) {
      const messages = batch.map((token) => ({
        to: token,
        title,
        body,
        data: data ?? {},
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
