import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Public endpoint (verify_jwt = false): organisers create their account on
// the website, then sign in to the app where the admin role is picked up
// automatically. When organiser accounts become paid, a Stripe checkout
// verification slots in here — the form and the app don't change.

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
    const { name, email, password } = await req.json();

    if (!name?.trim() || !email?.trim() || !password) {
      return reply(400, { error: 'name, email and password are required' });
    }
    if (password.length < 8) {
      return reply(400, { error: 'Password must be at least 8 characters' });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

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

    await admin.from('profiles').update({ name: name.trim() }).eq('id', userId);

    const { error: adminError } = await admin
      .from('admins')
      .insert({ profile_id: userId });
    if (adminError) {
      // Roll back so the email isn't left stranded as a half-made account.
      await admin.auth.admin.deleteUser(userId);
      return reply(500, { error: 'Could not grant organiser access, please try again' });
    }

    return reply(200, { ok: true });
  } catch (err) {
    console.error('create-admin-account error:', err);
    return reply(500, { error: 'Unexpected error' });
  }
});
