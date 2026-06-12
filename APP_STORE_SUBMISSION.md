# Pitch — App Store Submission Packet

Everything needed to publish Pitch to the iOS App Store. Work top to bottom.
Fields marked **[paste]** are copied directly into App Store Connect.

---

## 0. Prerequisites (you must do these)

1. **Apple Developer Program** — enrol at https://developer.apple.com/programs/enroll
   ($99 USD/year). Use Apple ID `madhukiran92@gmail.com` (already in `app/eas.json`).
   Approval is usually same-day.
2. A reachable **support email**: `hello@pitchapp.net` — set up Cloudflare Email Routing
   so it forwards to your inbox (Cloudflare dashboard → your domain → Email → Email Routing).
   Apple emails the review outcome and users contact you here.

---

## 1. App record in App Store Connect

Go to https://appstoreconnect.apple.com → **Apps** → **+** → **New App**

| Field | Value |
|---|---|
| Platform | iOS |
| Name | **Pitch: Organise Your Game** |
| Primary language | English (Australia) |
| Bundle ID | `com.madhukiran.pitch` (select from list — created by the first EAS build) |
| SKU | `pitch-ios-001` |
| User access | Full Access |

> Note: the bundle ID only appears in the dropdown **after** the first `eas build`
> (step 4) registers it. So: run the build first, then create the app record.

---

## 2. App information

- **Subtitle** [paste]: `Pickup games, sorted.`
- **Category**: Primary **Sports**, Secondary **Lifestyle**
- **Content rights**: Does not use third-party content → No
- **Age rating**: answer the questionnaire → expected **4+**
  - All content categories: None
  - Unrestricted web access: No
  - The app has user-generated content (names, game titles) but no open feed,
    messaging, or media uploads, so it stays 4+. We provide content filtering by
    moderation, a report path (email), and account removal — see §6.

---

## 3. Store listing copy

### Promotional text [paste] (max 170 chars, editable any time without review)
```
Run your weekly footy, hoops, or tennis game without the group-chat chaos. Pitch handles sign-ups, the waitlist, and team splits automatically.
```

### Description [paste]
```
Pitch is the easiest way to organise recreational sport with your crew — for any game, any sport.

Stop counting heads in the group chat. Create a game, share it, and let players join with one tap. When it fills up, Pitch runs the waitlist for you — and when someone drops out, the next person is promoted automatically and notified instantly.

WHY PEOPLE USE PITCH

• One-tap join — see every upcoming game, who's in, and how many spots are left
• Smart waitlist — full game? Join the list and get bumped up automatically when a spot opens
• Push notifications — know the moment you're confirmed, added to a game, or a game is cancelled
• Balanced teams — generate fair teams in one tap on match day
• Any sport — football, basketball, cricket, tennis, rugby, volleyball and more
• Real-time — player lists update live as people join and leave

HOW IT WORKS

Players: download Pitch, sign up in seconds, and join the games you're invited to.

Organisers: create your free organiser account at pitchapp.net, then sign in to the app — your game-management tools appear automatically.

Free to download. No ads. No subscription.

Pitch is a product of Nila.
```

### Keywords [paste] (max 100 chars, comma-separated, no spaces)
```
sport,football,soccer,pickup,game,team,waitlist,rsvp,organise,squad,futsal,basketball,tennis,club
```

### Support URL [paste]: `https://pitchapp.net`
### Marketing URL [paste]: `https://pitchapp.net`

---

## 4. Build & upload (you run these; some steps are interactive)

From `~/Projects/friday-football/app`:

```bash
# 1. Production build in the cloud (~15 min). First run asks you to sign into
#    your Apple account so EAS can create the signing certificate + provisioning
#    profile, and registers the com.madhukiran.pitch bundle ID.
eas build --platform ios --profile production

# 2. After the app record exists (§1), upload the build to App Store Connect:
eas submit --platform ios --latest
```

The build appears under **TestFlight** within ~15 min of submit (Apple processes it).
Add yourself as an Internal Tester to install it on your own iPhone immediately —
no review required for TestFlight.

---

## 5. Screenshots (required — 6.7" display, 1290 × 2796)

Apple requires at least one set at the 6.7-inch size. See `STORE_ASSETS.md` /
the `store-assets/` folder for generated frames, or capture from the simulator:
Home (game list), a game card with the waitlist, Teams, and the Create-game screen.
Upload 3–5 in App Store Connect → the iOS app version → Previews and Screenshots.

---

## 6. App Review information (this is where this app usually gets stuck)

Reviewers cannot reach the organiser/admin features because organiser accounts are
created on the website, not in the app. **You must give them a working organiser
login and explain the model**, or it will be rejected under Guideline 2.1.

### Sign-in required: **Yes**

### Demo account [paste into Review Notes]
- Email: `review@pitchapp.net`  ← create this organiser account at pitchapp.net/admin before submitting
- Password: (set a strong one and paste it here)

### Review notes [paste]
```
Pitch has two account types:

• PLAYERS sign up directly in the app (tap "Sign up" on the login screen) and join
  games they're invited to.

• ORGANISERS create their account on our website (https://pitchapp.net/admin), then
  sign in to the app with the same email/password. The app then shows organiser tools
  (the "Admin" tab) automatically — there is no admin sign-up inside the app.

To review the full app including organiser features, please sign in with the demo
organiser account above. It can create games, manage players, and generate teams.

There are no paid features. Organiser accounts are free. The app contains no in-app
purchases and does not sell anything.

User-generated content is limited to display names and game titles. We moderate
content, users can be removed by organisers, and anyone can report content by emailing
hello@pitchapp.net (stated in the in-app Terms of Service, reachable from Profile → Legal).
```

### Contact info: your name, phone number, and `hello@pitchapp.net`

---

## 7. App Privacy ("nutrition label") — Data collected

App Store Connect → App Privacy → answer the questionnaire with:

| Data type | Collected | Linked to identity | Used for tracking | Purpose |
|---|---|---|---|---|
| Email address | Yes | Yes | No | App Functionality |
| Name | Yes | Yes | No | App Functionality |
| User ID | Yes | Yes | No | App Functionality |
| Phone number (optional) | Yes | Yes | No | App Functionality |
| Push token / Device ID | Yes | Yes | No | App Functionality (notifications) |

- We do **not** use data for tracking or advertising.
- We do **not** share data with data brokers.
- Privacy Policy URL [paste]: `https://pitchapp.net/privacy`

---

## 8. Pre-submission checklist

- [ ] Apple Developer enrolment active
- [ ] `hello@pitchapp.net` and `review@pitchapp.net` forwarding works
- [ ] Demo organiser account created at pitchapp.net/admin, credentials in Review Notes
- [ ] pitchapp.net/privacy and /terms live (deployed via Cloudflare Pages)
- [ ] `eas build --platform ios --profile production` succeeded
- [ ] `eas submit` uploaded; build shows in TestFlight
- [ ] Installed via TestFlight on a real iPhone and sanity-checked
- [ ] Screenshots uploaded (6.7")
- [ ] All §2–§7 fields filled in App Store Connect
- [ ] "Submit for Review"

Typical review time: 1–3 days. First submission for a new app sometimes takes longer.

---

## Known guideline risks (and how we've covered them)

| Risk | Guideline | Mitigation |
|---|---|---|
| Reviewer can't access admin features | 2.1 | Demo organiser account + notes in §6 |
| User-generated content moderation | 1.2 | Report-by-email + organiser removal, stated in Terms |
| Privacy policy required | 5.1.1 | Hosted at pitchapp.net/privacy |
| Sign in with Apple | 4.8 | Not required — we use email/password only, no third-party social login |
| External account creation / IAP | 3.1.1 | No paid features; organiser accounts are free; app sells nothing |
| Account deletion in-app | 5.1.1(v) | ✅ Done — Profile → "Delete Account" (double-confirm → `delete_my_account` RPC) |

> **Account deletion** is implemented: Profile screen has a "Delete Account" button
> with a two-step confirmation that calls a `SECURITY DEFINER` `delete_my_account()`
> RPC. It removes the user's `auth.users` row, which cascades to their profile,
> registrations, admin role, push tokens, and team memberships. Games they created
> are preserved with `created_by` set to NULL.
