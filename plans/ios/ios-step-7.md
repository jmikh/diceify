# iOS step 7 — Submission

Plan: `plans/ios/ios-app-plan.md` § 9 step 7. Repo side 2026-10-05 (branch `ios-launch`).

## What exists

- **Privacy manifest** `ios/Diceify/Resources/PrivacyInfo.xcprivacy`: no tracking; the collected data types below; the
  file-timestamp API (`C617.1`) for supabase-swift's Storage client, which has no manifest of its own. The other SDKs
  (PostHog, RevenueCat, Sentry, GoogleSignIn + dependencies) ship theirs. Crash data is left out while Sentry is off
  (`SENTRY_DSN` empty in `Release.xcconfig`): setting a DSN means adding Crash Data here and in App Privacy.
- **Version**: `MARKETING_VERSION` 1.0, `CURRENT_PROJECT_VERSION` 1 in `ios/project.yml`; Info.plist now reads both
  (XcodeGen used to write a literal 1.0 / 1). **Raise `CURRENT_PROJECT_VERSION` before every upload.**
- **Legal pages** (web, needs a deploy): `/privacy` and `/terms` cover the iOS app: Sign in with Apple, App Store
  billing through Apple + RevenueCat, cancel and refunds through Apple, on-device drafts, the photo picker / camera,
  in-app account deletion, the Creator Pass as web-only.
- **Fixes found while preparing**: the Tune preview sat at the bottom of its frame on tall screens (6.9"); the DEBUG
  `--ui-import` now waits for the stored session, so a signed-in import becomes a cloud project.
- **Screenshots** (6.9", 1320×2868, no alpha) in `~/Desktop/Diceify App Store/` (not in the repo): 01 start (project
  list), 02 crop, 03 tune, 04 build, 05 share. Photo: the Mona Lisa (public domain, Wikimedia Commons). Recipe: local
  user `screens@test.dev` / `pass1234` (Studio, local stack only), iPhone 17 Pro Max simulator, status bar overridden
  to 9:41, `--ui-import` / `--ui-open <id> --ui-step …` / `--ui-share`; the app opens its cached copy, so reinstall
  after editing the project in the database.

## App Store Connect: what to enter

### App Information
| Field | Value |
|---|---|
| Name | `Diceify: Dice Art Maker` (or keep `Diceify`) |
| Subtitle | `Turn photos into dice mosaics` |
| Primary category | Graphics & Design (secondary, optional: Lifestyle) |
| Content rights | Does not contain, show or access third-party content |
| Age rating | answer **None / No** to every question (no user-generated content is shown to other users in the app; share links open on the web) → 4+ |

### Pricing and Availability
Free; all countries. The subscriptions carry the price ($9 / $36 in the US).

### Version 1.0 page
| Field | Value |
|---|---|
| Screenshots (iPhone 6.9") | the five files, in order |
| Promotional text | `Turn any photo into dice art and build it by hand. Crop, tune, count your dice, then follow the builder die by die, row by row.` |
| Keywords | `portrait,mosaic,pixel art,photo,picture,craft,diy,gift,pattern,blueprint,builder,generator,hobby` |
| Support URL | `https://diceify.art/about` (has the support email) |
| Marketing URL | `https://diceify.art` |
| Copyright | `2026 John Mikhail` |
| Build | the uploaded build (after processing) |
| In-App Purchases and Subscriptions | `studio_monthly`, `studio_yearly` (already in the draft submission) |

**Description**

```
Turn any photo into dice art you can build by hand.

Diceify turns a photo into a mosaic of real six-sided dice, then guides you while you build it, one die at a time.

HOW IT WORKS
• Pick a photo or take one, and crop it.
• Tune the dice: 20 to 120 rows, contrast, brightness and sharpness, black, white or mixed dice.
• See exactly how many black and white dice you need.
• Build it row by row: the builder shows the face and rotation of every die and highlights the one you are placing.
• Share a link to your dice art.

YOUR PROJECTS, EVERYWHERE
Sign in with Apple or Google to save your projects and continue on any device, including diceify.art on your computer. Without an account, your draft stays on your phone.

DICEIFY STUDIO
The builder is free for the first 5 rows of every project. Studio unlocks unlimited building and full-resolution SVG blueprints.
• Studio Monthly and Studio Yearly are auto-renewable subscriptions.
• Payment is charged to your Apple ID when you confirm the purchase. The subscription renews automatically unless auto-renew is turned off at least 24 hours before the end of the current period; your account is charged for the renewal within the 24 hours before the period ends. Manage or cancel it in your Apple ID's subscription settings.
• A plan bought on diceify.art works in the app when you sign in with the same account.

Terms of Use: https://diceify.art/terms
Privacy Policy: https://diceify.art/privacy
```

### App Review Information
- Sign-in required: **No** (no demo account needed).
- Notes:

```
Diceify works without an account: tap "Choose a photo" to start a project (Crop → Tune → Build).
Sign-in is optional (Sign in with Apple or Google) and only needed to save projects to the cloud, share, and subscribe; any Apple ID works.
In-app purchase: after signing in, tap the account icon (top right) → See plans, or continue past row 5 in the Build step. The Studio subscriptions are bought in the sandbox.
Plans bought on our website (diceify.art) are honoured when the user signs in with the same account; the app has no links to purchases outside the App Store.
Account deletion: account icon → Delete account.
```

### App Privacy (must match the manifest)
Tracking: **No**. Data types, all **linked to the user**, none used for tracking:

| Category → type | Purposes |
|---|---|
| Contact Info → Email Address | App Functionality |
| Contact Info → Name | App Functionality |
| User Content → Photos or Videos | App Functionality |
| User Content → Other User Content (project settings) | App Functionality |
| Identifiers → User ID | App Functionality, Analytics |
| Purchases → Purchase History | App Functionality |
| Usage Data → Product Interaction | Analytics |

Privacy Policy URL: `https://diceify.art/privacy`.

### Also
- Subscriptions: the monthly one's display name is "Diceify Studio", the yearly one's "Studio"; pick one for both.
- Export compliance is answered in the binary (`ITSAppUsesNonExemptEncryption` = false).

## Order
1. Merge `ios-launch` into `master` and push (deploys `/privacy` and `/terms`; the review reads them).
2. Upload the build (Claude: archive + upload with `-allowProvisioningUpdates`), wait for processing.
3. Enter the fields above, select the build, add the version to the draft submission, Submit for Review.
4. Paid Apps agreement Active before submitting (review buys in the sandbox).
