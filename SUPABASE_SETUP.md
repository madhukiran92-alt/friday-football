# Supabase Setup Guide

## 1. Create a Supabase project

1. Go to https://supabase.com and sign up / log in
2. Click **New project**
3. Choose a name (e.g. `friday-football`), set a database password, pick a region close to you
4. Wait ~2 minutes for the project to spin up

## 2. Run the schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy the contents of `supabase/schema.sql` and paste it in
4. Click **Run** — you should see "Success"

## 3. Enable Phone auth

1. Go to **Authentication → Providers**
2. Enable **Phone** provider
3. For development, enable **"Enable phone confirmations"** and use the test OTP (`000000`)
4. For production you'll need a Twilio account — Supabase has a guide under the Phone provider settings

## 4. Get your API keys

1. Go to **Project Settings → API**
2. Copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Paste them into the `.env` file in the app root (created during app setup)

## 5. Add yourself as the first admin

After you sign up in the app for the first time:

1. Go to **Table Editor → profiles** in Supabase
2. Find your row and copy your `id` (UUID)
3. Go to **SQL Editor** and run:

```sql
INSERT INTO admins (profile_id) VALUES ('<your-uuid>');
```

That's it — you're now an admin and can add others from within the app.
