import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Public endpoint (verify_jwt = false): the caller has no account yet.
// The gate is a valid, unused admin invite code. When admin accounts
// become paid, this gate is swapped for a Stripe checkout session id —
// nothing else in the funnel changes.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'method not allowed' });

  try {
    const { name, email, password, invite_code } = await req.json();

    if (!name?.trim() || !email?.trim() || !password || !invite_code?.trim()) {
      return reply(400, { error: 'name, email, password and invite_code are required' });
    }
    if (password.length < 8) {
      return reply(400, { error: 'Password must be at least 8 characters' });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const code = invite_code.trim().toUpperCase();

    // Fast-fail before creating anything.
    const { data: invite } = await admin
      .from('admin_invites')
      .select('id')
      .eq('code', code)
      .is('used_by', null)
      .maybeSingle();
    if (!invite) {
      return reply(403, { error: 'Invalid or already-used invite code' });
    }

    // Create the auth user (DB trigger creates the profile row).
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
    });
    if (createError || !created?.user) {
      const msg = createError?.message ?? 'Could not create account';
      const status = /already.*(registered|exists)/i.test(msg) ? 409 : 400;
      return reply(status, { error: status === 409 ? 'An account with this email already exists' : msg });
    }
    const userId = created.user.id;

    // Atomically claim the code (compare-and-set on used_by IS NULL).
    // If someone raced us to it, undo the user we just created.
    const { data: claimed } = await admin
      .from('admin_invites')
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq('id', invite.id)
      .is('used_by', null)
      .select('id');
    if (!claimed?.length) {
      await admin.auth.admin.deleteUser(userId);
      return reply(403, { error: 'Invalid or already-used invite code' });
    }

    await admin.from('profiles').update({ name: name.trim() }).eq('id', userId);

    const { error: adminError } = await admin
      .from('admins')
      .insert({ profile_id: userId });
    if (adminError) {
      // Roll back fully so the code can be reused.
      await admin.auth.admin.deleteUser(userId);
      await admin.from('admin_invites').update({ used_by: null, used_at: null }).eq('id', invite.id);
      return reply(500, { error: 'Could not grant admin access, please try again' });
    }

    return reply(200, { ok: true });
  } catch (err) {
    console.error('create-admin-account error:', err);
    return reply(500, { error: 'Unexpected error' });
  }
});
