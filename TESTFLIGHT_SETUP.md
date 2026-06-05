# TestFlight Distribution Guide

This is how you build the app and get it onto your friends' iPhones via TestFlight.

---

## Prerequisites

- Apple Developer account ($99/year) — sign up at https://developer.apple.com
- Expo account (free) — sign up at https://expo.dev
- Supabase set up and `.env` filled in (see SUPABASE_SETUP.md)

---

## Step 1 — Log in to Expo

In your terminal, from the `app/` folder:

```bash
cd app
npx eas-cli login
```

Sign in with your Expo account credentials.

---

## Step 2 — Link the project to Expo

```bash
npx eas-cli init
```

This creates a project on expo.dev and adds an `extra.eas.projectId` to your `app.json`. Commit the updated `app.json` after this.

---

## Step 3 — Build for TestFlight (preview build)

```bash
npx eas-cli build --platform ios --profile preview
```

- EAS will ask for your Apple Developer credentials the first time
- It handles provisioning profiles and certificates automatically
- The build runs in the cloud — takes ~10-15 minutes
- You'll get a link to download the `.ipa` when done

---

## Step 4 — Submit to TestFlight

Once the build finishes:

```bash
npx eas-cli submit --platform ios --latest
```

Before running this, fill in `eas.json` → `submit.production.ios`:
- `ascAppId` — your App Store Connect App ID (create the app at https://appstoreconnect.apple.com first)
- `appleTeamId` — found in your Apple Developer account under Membership

---

## Step 5 — Share with friends

1. Go to https://appstoreconnect.apple.com
2. Open your app → **TestFlight** tab
3. Click **+** next to External Testing → create a group (e.g. "Friday Football Crew")
4. Add testers by email, or turn on the **Public Link** to share a single link over WhatsApp
5. Friends get an invite email / link, install the **TestFlight** app from the App Store, and then install Friday Football from within it

---

## Updating the app

When you make changes:

1. Bump `version` or `buildNumber` in `app.json`
2. Run `npx eas-cli build --platform ios --profile preview` again
3. Run `npx eas-cli submit --platform ios --latest`
4. TestFlight notifies your testers automatically

---

## Running locally during development

To test on your own iPhone without building:

```bash
cd app
npx expo start
```

Scan the QR code with your iPhone camera — opens in Expo Go app.
