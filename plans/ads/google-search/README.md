# Google Search ads for Diceify

One Search-only campaign, built for the existing Google Ads account **814-560-1782** (linked to GA4 since 2026-01-27).
`editor-import.csv` holds the whole campaign for Google Ads Editor; it imports **Paused**, so nothing spends until you
enable it. Data below as of 2026-10-05.

## What the data says

- **Demand is almost all tool intent.** Search Console (Apr–Oct 2026): "dice art generator" (2.1k impressions),
  "dice art" (4.9k), "photo to dice art", "dice portrait", "dice mosaic generator", "dice art generator free", then a long
  tail of "turn a picture into dice". Those clusters are the ad groups.
- **The Performance Max run (Mar–May 2026) bought junk.** 6,812 sessions (5,493 from France), 21 editor opens,
  3 upgrade clicks, 0 French customers. It optimised for the account's page-load "conversions". Hence: Search only, no
  Search Partners, no Display, English-speaking countries only, real purchase conversions.
- **Buyers are mostly American.** 101 of 137 live Stripe charges are US; then AU 7, CA 6, IN 6, GB 4.
- **Organic already ranks ~3 on mobile** for the core terms; desktop "dice art generator" slid to 20–46. Ads add the most
  on desktop, and desktop users click Upgrade 2.5× as often (6.1% vs 2.4% of editor openers).

## Economics (why the bids are low)

| | |
|---|---|
| Paying customers since Dec 2025 | 94, $2,314 total → **$24.60 per customer** ($20.50 first purchase) |
| Visitor → customer (Apr–Sep, PMax traffic excluded) | ~44 new customers / ~4,700 users ≈ **1%** |
| Break-even cost per click | ~$0.25 on average; ~$0.40 desktop, ~$0.15–0.20 mobile |
| Target cost per purchase | **≤ $20** (pays back on the first purchase) |

So: Manual CPC, $0.30 base on the core ad groups, **desktop +40% ($0.42), mobile −30% ($0.21)**. Organic gets these
queries ~120 times a day worldwide, so expect roughly 5–20 clicks/day in the target countries, i.e. **$2–6/day**.
The $10/day budget is a ceiling, not a target.

## 1. Fix conversion tracking first (no code needed)

1. **Google Ads → Goals → Summary:** take the two "Page view / Page load" actions (they show in GA4 as
   `ads_conversion_Page_view_Page_load_dic_1` and `_dic_2`, ~11k each in six months) out of the Conversions column:
   remove the **Page view** goal from the account-default goals, or remove the two actions. (Setting them to
   Secondary is greyed out when they are the only actions in their goal: every goal needs one primary action.)
2. **GA4 → Admin → Events → Create event:** name `purchase_web`; conditions `event_name` equals `page_view` AND
   `page_location` contains `checkout=success`. (Stripe returns buyers to `/account?checkout=success`; the old site's
   `/?success=true` logged 104 views against ~94 customers, so it tracks real purchases.) Then **Admin → Key events**:
   mark `purchase_web`.
3. **GA4 → Admin → Data streams → web → Configure tag settings → Show more → List unwanted referrals:** add
   *Referral domain contains* `stripe.com` and *Referral domain contains* `accounts.google.`. Today the returns from
   Stripe Checkout (`checkout.stripe.com`, 257 sessions) and Google sign-in (`accounts.google.com`, 680 sessions;
   sign-in is required before checkout) start new referral sessions, which would take the purchase credit away from
   the ad click. Applies from the moment it's saved; no deploy needed.
4. **Google Ads → Goals → Conversions → New → Import → Google Analytics 4 (web):** `purchase_web` as **Primary**,
   category Purchase, value **$20.50 for every conversion**, count **One**. Also mark `photo_uploaded` and
   `checkout_started` as key events in GA4 and import both (categories **Engagement** and **Begin checkout**;
   Google Ads has no "Other"), no value, count One. Each is the only action in its goal, so Google Ads forces
   **Primary**; that's fine as long as Engagement and Begin checkout are **not account-default goals** (don't accept
   the suggestion to add them): then they only show in *All conv.* / segmented by conversion action, never in
   Conversions or bidding. Check: campaign → Settings → Goals lists only **Purchase**. Why track them: purchases are
   too rare to judge ad groups early, uploads show whether the clicks are real users within ~2 weeks. Use
   `photo_uploaded`, not `hero_upload`: it fires for both the editor dropzone and the homepage hand-off, so
   importing both would double-count.
5. **Google Ads → Admin → Account settings:** auto-tagging **on**.

Created events only apply to new data, so do this before enabling the campaign.

## 2. Import the campaign

Google Ads Editor → Get recent changes for 814-560-1782 → **Account → Import → From file** → `editor-import.csv` →
review → Keep → **Post**. The campaign arrives Paused with:

| Ad group | Max CPC | Keywords (exact + phrase) | Landing page |
|---|---|---|---|
| Generator | $0.30 | 16 + 5 ("dice art generator", "dice picture generator", …) | `/` |
| Generator - Free | $0.20 | 8 + 3 ("dice art generator free", …) | `/` |
| Photo to Dice | $0.30 | 27 + 7 ("photo to dice art", "turn a picture into dice", …) | `/` |
| Dice Portrait | $0.30 | 9 + 1 | `/` |
| Dice Mosaic | $0.25 | 6 + 1 | `/` |
| Template & Pattern | $0.30 | 9 + 4 ("dice art template", "dice art pattern", …) | `/` |
| How To | $0.15 | 10 + 2 ("how to make dice art", …) | `/dice-art` |
| Dice Art - General | $0.15 | 15 + 0 ([dice art], [pictures made of dice], …) | `/` |

- The other ad groups have a negative "free", so "free" searches all go to *Generator - Free* (lower bid, ad copy says
  the preview and dice counts are free and the builder/blueprint are paid).
- 107 campaign negatives: dice games/rollers/D&D, Dice.com jobs, cooking ("dice an onion"), clipart/icons, physical dice
  products and kits, Lego/Rubik's/domino mosaics, "for sale"/commissions, Andrew Dice Clay, "Dicify".
- One responsive search ad per group: 6 headlines written for that group + 9 shared ones, 4 descriptions. Every claim is
  one the site makes: free to start / no sign-up to preview, exact black & white dice counts, 20–120 rows, standard dice,
  row-by-row build, SVG blueprints and full builder on paid plans ($19 for 30 days, $9/month Studio). No "free
  download" claim (there isn't one).
- No brand campaign: "diceify" ranks #1 organically with 81% CTR. Add one only if a competitor starts showing on it.
- Final URL suffix adds `utm_source=google&utm_medium=cpc&utm_campaign=search_dice_art&utm_term={keyword}` so PostHog
  sees the keyword too.

## 3. Settings to set after import (Editor or web UI)

- **Locations:** US, CA, UK, AU, NZ, IE are imported; set *Location options* to **Presence** ("people in or regularly
  in"), not "interest".
- **Devices:** desktop **+40%**, mobile **−30%**, tablet 0%.
- **Networks:** confirm Search Partners and Display are **off** (the CSV sets Google Search only).
- **Recommendations → Auto-apply:** turn **everything off** (broad match upgrades, new keywords, budget raises, bid
  strategy changes).
- **Automatically created assets:** **off**, so Google doesn't write claims the product can't back.
- **AI Max:** **off** (it's on by default). It adds keywordless matching, rewrites headlines and swaps landing pages,
  which undoes the tight keywords and the vetted ad copy.
- **EU political ads:** **No**. Editor refuses to post until it is set.
- Editor's other warnings are intentional or covered here: manual bidding, Search Partners / Display expansion off,
  no audiences; callouts, sitelinks, snippets come from section 4. Image assets (3+, square and 1.91:1, e.g. gallery
  renders) are optional and worth adding later.

## 4. Assets (add in the web UI, campaign level; lengths checked)

**Sitelinks** (text / description 1 / description 2 → URL)
- Dice Art Gallery / Portraits rendered in dice / See what a photo can become → `/gallery`
- How Dice Art Works / From photo to finished mosaic / Sizes, dice counts and tips → `/dice-art`
- Dice Size Calculator / How many dice, how big / Plan the board before you buy → `/dice-art/size-calculator`
- Best Photos for Dice Art / Pick, crop and tune a photo / Get a sharper dice portrait → `/dice-art/best-photos`
- How to Glue Dice Art / Adhesives and boards compared / Two methods, step by step → `/dice-art/how-to-glue-dice-art`

**Callouts:** Free to Start · No Sign-Up to Preview · Runs in Your Browser · Exact Dice Counts · Row-by-Row Build Guide ·
Standard Six-Sided Dice · Grids up to 120 Rows · Studio: Cancel Anytime

**Structured snippet** (header *Types*): Portraits, Pet Portraits, Family Photos, Couples, Mosaics, Murals

**Price** (type Services, USD, URL `/#pricing`): Creator Pass $19 "30 days of full access" · Studio Monthly $9 per month
"Monthly, cancel anytime" · Studio Yearly $36 per year "Full builder for a year"

## 5. Launch and review

- Before enabling, check Keyword Planner's first-page bids for the top 10 keywords. If they're well above $0.30, that
  only means fewer impressions at these bids. Don't raise bids to chase them before conversions say so.
- **Week 1–2:** read the Search terms report every few days; add irrelevant terms as campaign negatives, and add new
  good terms as exact keywords.
- **After 4 weeks or 300 clicks:** cost per `purchase_web` ≤ $20 → raise bids ~20% and lift the budget;
  $20–40 → cut mobile further / pause the low-intent groups (General, How To); > $40 or 0 purchases → pause.
- Watch whether organic clicks on the same queries drop (Search Console, desktop vs mobile). If ads only replace
  free mobile clicks, cut mobile bids further.
- Smart Bidding (Maximize conversions / tCPA) only once the campaign has ~30 purchases a month. At this budget that
  probably won't happen, so stay on Manual CPC.
