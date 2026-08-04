# GG'APP Mobile — Parity Audit, Design Review & Redesign Plan

**Date:** July 26, 2026
**Scope:** Patient side only. Compares `gg-monorepo/apps/mobile` against the PWA `gg-app` (`src/features/patient/**`, `src/router/PatientRouter.tsx`).
**Method:** Route-by-route code comparison, token comparison, plus review of the 38 captured screens in `design-screenshots/`.

---

## Executive summary

Route-level parity is essentially complete — every patient route in `PatientRouter.tsx` has a mobile equivalent. The existing `GAP_ANALYSIS.md` figure of ~95% parity is fair **for navigation**, but it measures the wrong thing. The real divergence is in three places:

1. **Brand.** The mobile app uses a different navy, a different blue, a different background, and a different typeface than both the web app and the logo. The web tokens are annotated "Core Brand Dark / Accent / Background"; mobile silently reimplemented all three. Mobile is off-brand today.
2. **Notification behaviour.** Web drives dashboard banners off *unread notification items* and persists dismissal. Mobile derives them off *state* and dismisses into a `useState` — so banners resurrect on every app restart, and two banner families (prescription quote/ready, provider-cancelled appointment) have no mobile equivalent at all.
3. **Design-system discipline.** A `typography` scale exists in `src/theme/typography.ts` and is imported by **zero** files. Every screen hardcodes `fontSize`. Same story for spacing. The result is 9px labels, ragged grids, and four different header treatments.

Nothing here is a rewrite. It is one token swap, one component layer, and roughly a dozen screen-level corrections.

---

# Part 1 — Feature comparison

## 1.1 Route parity

Every web patient route maps to a mobile screen. Verified against `PatientRouter.tsx` and `src/navigation/types.ts`:

| Web route | Mobile screen | Status |
|---|---|---|
| `dashboard` | `home/DashboardScreen` | Present |
| `services` | `services/FindServiceScreen` | Present |
| `services/:category` | `services/ProviderListScreen` | Present |
| `services/provider/:id` | `services/ProviderProfileScreen` | Present |
| `booking` (EngageForm) | `services/BookingFormScreen` | Present |
| `booking/confirm` | `services/BookingConfirmScreen` | Present |
| `credit` | `credit/CreditWalletScreen` | Present |
| `credit/disclaimer` · `apply` · `increase` · `status` | matching `credit/*` screens | Present |
| `invoices` · `:id` · `:id/pay` · `:id/success` | `payments/*` | Present |
| `appointments` · `:id/reschedule` | `payments/AppointmentsScreen`, `home/RescheduleReviewScreen` | Present |
| `prescriptions` · `confirm` · `:id` | `services/Prescription*` | Present |
| `transactions` | `payments/TransactionHistoryScreen` | Present |
| `profile` · `security/pin` · `notifications` | `profile/*` | Present |

Mobile additionally has `CreditInitialApplyScreen`, `EmptyWalletScreen`, `EmptyCreditStatusScreen`, and a dedicated `BeneficiariesScreen` — genuinely ahead of web there.

Provider list filtering (`all` / `open` / `nearest` / `top-rated`), geolocation distance enrichment, split invoice payment, PIN auth, rebook, and provider review submission are all present on both. Those are real parity.

## 1.2 Confirmed gaps

### A. Legal documents are absent — and the consent links are dead

Web ships `features/legal/LegalDocumentScreen.tsx`, `TermsScreen.tsx`, `PrivacyPolicyScreen.tsx` with real content in `termsContent.ts` and `privacyPolicyContent.ts`. Mobile has none.

Worse, [RegisterScreen.tsx:416-421](src/screens/auth/RegisterScreen.tsx#L416-L421) renders "Terms of Service" and "Privacy Policy" with a `linkInline` style, but both sit inside the checkbox's `Pressable` and have no `onPress` of their own. They look like links and do nothing except toggle the checkbox underneath them.

This is the highest-priority gap. It is a false consent flow, and both app stores require a reachable privacy policy for a health app that collects identity documents.

### B. Dashboard notification banners are state-derived, not notification-derived

Web ([DashboardScreen.tsx:258-385](../../../gg-app/src/features/patient/DashboardScreen.tsx)) reads unread items via `getUnreadCreditApprovalItems`, `getUnreadConfirmedAppointmentItems`, `getUnreadPrescriptionQuoteItems`, `getUnreadPrescriptionReadyItems`, `getUnreadProviderCancelledAppointmentItems`, calls `markNotificationRead` on action, and persists seen IDs to `localStorage`.

Mobile ([DashboardScreen.tsx:276-365](src/screens/home/DashboardScreen.tsx#L276-L365)) instead checks `creditStatus === 'approved'`, `nextAptStatus === 'confirmed'`, etc., and dismisses via `useState<Set<string>>`. Three consequences:

- **Dismissal does not persist.** Kill the app, and every banner is back. The "Your healthcare credit was approved" banner in `01-dashboard.png` will greet the user on every single launch for as long as their credit is approved — forever.
- **No prescription quote / prescription ready banners.** Web has both; mobile has neither, despite mobile having the full prescription flow.
- **No provider-cancelled-appointment banner.** Web has `AppointmentCancelledBanner`; mobile has nothing.

### C. No search on the dashboard

Web's "Find a Service" card contains a search form that routes to `/app/services?q=…`. Mobile's equivalent card ([DashboardScreen.tsx:452-501](src/screens/home/DashboardScreen.tsx#L452-L501)) has the category grid only. Search exists on mobile but is one tab away.

### D. "Global Specialists" row is inert

[DashboardScreen.tsx:487](src/screens/home/DashboardScreen.tsx#L487) — `<Pressable style={s.globalRow}>` has no `onPress`. Web navigates to `/app/services`. The row looks tappable and isn't.

### E. Dashboard shows one appointment, web shows a list

Web renders `DashboardAppointmentsCard` over the full filtered appointment list. Mobile renders only `appointments[0]`. A patient with three upcoming visits sees one.

### F. No step indicator in multi-step flows

Web has `design-system/StepIndicator` used in `PINAuthScreen` (and the registration flow). Mobile's PIN and booking flows have no progress affordance.

## 1.3 Not gaps (verified parity)

Recorded so they don't get re-litigated: provider reviews (submission exists on mobile in `ProviderProfileScreen` and `PaymentSuccessScreen`), prescription attachments (`src/lib/attachments.ts`), finance-partner selection (`CreditInitialApplyScreen`), geolocation distances, provider filters, split payment, beneficiaries.

---

# Part 2 — Design review

## 2.1 The brand problem

This is the finding that matters most, because it invalidates a lot of surface-level polish.

| Role | Logo | Web (`gg-app`) | Mobile (`apps/mobile`) |
|---|---|---|---|
| Brand dark | deep navy | `#091C44` "Core Brand Dark" | `#011F4A` |
| Brand accent | sky blue | `#38B6FF` "Core Brand Accent" | `#2F9BFF` |
| Background | — | `#FAF6F5` warm alabaster | `#EAF2F8` cool porcelain |
| Border | — | `#EAE6E5` warm neutral | `#DCE6F0` cool blue-grey |
| Typeface | — | Figtree | Plus Jakarta Sans |

The mobile `tokens.ts` header comment describes a "Porcelain + Deep Navy" redesign and calls `#2F9BFF` "close to the GG'APP logo accent". It isn't the logo accent, and the porcelain background is a cool blue-grey where the brand background is a warm off-white. Every mobile screenshot reads slightly colder and bluer than the web app. Side by side they do not look like the same product.

Two further consequences of the drift:

- **Semantic colours diverged too.** Web deliberately maps `success → blue500` and `warning → navy800` to keep yellow and green out of the brand. Mobile uses `#1FBE86` green and `#F5A623` amber. That is why `01-dashboard.png` has a bright green "Ksh.11,400.00" and a yellow "Coming Soon" pill — two colours that appear nowhere in the brand.
- **The web's collapse is itself too aggressive** and should not be copied wholesale: mapping success onto the accent blue makes "Confirmed" and "Pending" states indistinguishable by hue. Part 3 proposes a restrained middle path.

### Contrast failures caused by the current palette

Measured against WCAG AA (4.5:1 for body text):

| Combination | Where | Ratio | Verdict |
|---|---|---|---|
| `#F5A623` on `#FFF6E5` | "Coming Soon" pill, warning pills | **1.96:1** | Fails badly |
| `#2F9BFF` on `#FFFFFF` | `historyLink`, "See all →", "View all →", all 11px links | **2.76:1** | Fails |
| `#38B6FF` on `#FFFFFF` | proposed brand accent, if used for text | **2.28:1** | Would fail |
| `#38B6FF` on `#091C44` | logo pairing, on-navy accents | **7.26:1** | Excellent |

The last row is the important one. **The brand accent is a superb on-navy colour and a poor on-white text colour.** That single fact should drive the whole colour architecture: lean into navy surfaces where the accent needs to sing, and use a darkened accent for links and small text on light surfaces. The logo already demonstrates the correct relationship.

## 2.2 Structural and component issues

### Header treatment is inconsistent across four patterns

- Dashboard: bespoke navy header with decorative circles, logo, greeting, pill, bell.
- Invoices / Wallet / Provider / Booking: shared navy `AppBar` with title + subtitle.
- Profile (`16-profile.png`): **no header at all** — plain navy text on the porcelain background.
- Auth: navy hero block with centred logo.

A patient moving Home → Invoices → Profile sees three different header languages in three taps.

### `AppBar` has two concrete defects

[AppBar.tsx:61](src/components/AppBar.tsx#L61) — `paddingTop: 14` is hardcoded with **no safe-area inset**. This is the root cause of the illegible status bar visible in `04-services-find.png`, `10-invoices.png`, `12-wallet.png`, `16-profile.png`: the light status bar content renders over the light page background because the navy bar starts *below* the inset.

[AppBar.tsx:41](src/components/AppBar.tsx#L41) — the back `Pressable` renders unconditionally; the `back` prop is never checked. That is why the Invoices tab **root** shows a back chevron that pops to nowhere meaningful.

### The type scale is defined and unused

`src/theme/typography.ts` exports a complete scale (`h1`…`tiny`). Grep for `typography.` across `src/` returns **zero matches**. Every screen imports `{ colors, fontWeights, radii }` and hardcodes sizes. In `DashboardScreen` alone: 9, 10, 11, 12, 13, 14, 18, 20, 22, 26px. The 9px `statLabel` and `balanceHeroLabel` are below any reasonable legibility floor on a phone.

### Screen-level findings

**Find a Service (`04-services-find.png`)**
- The search bar and a "Verified Network" trust badge share one navy pill. Two unrelated jobs in one control; the placeholder clips mid-word ("Search providers, services, l…").
- Category cards are 2-up and very tall — six categories need a scroll, where the dashboard fits the same six 3-up without scrolling. The two grids disagree about what a category looks like.

**Provider profile (`06-provider-profile.png`)**
- The full address appears twice: once wrapped over three lines in the header subtitle, once in the card below.
- "Open" appears twice: as a pill under the name and again as the `Status` row value.
- Star rating renders in amber — off-brand, and the only amber on the screen besides "Coming Soon".

**Invoices (`10-invoices.png`)**
- **Amounts have no currency symbol** — "1,500.00" where the dashboard and wallet both show "Ksh.". Inconsistent and, in a payments screen, genuinely risky.
- Row hierarchy is inverted: the invoice ID (`INV-2026-0867`) is the boldest element; the service name — the thing a patient actually recognises — is truncated to "Ben…".
- The "Authorized" status pill is light blue on light blue, which reads as a link, not a state. With every row identical, the column is pure noise.
- Filter chips sit outside the card, then the card title repeats the active filter ("All" → "All Invoices").

**Booking form (`08-booking-form.png`)**
- 17 time chips in a flat wrapped grid with no AM/PM grouping. Because chip widths vary, rows hold 4/3/4/4/3 items — visibly ragged, no column alignment.
- The bottom tab bar stays visible throughout a focused, multi-field task, and the submit CTA sits below the fold behind it. Easy to abandon by accident.
- "Service Types" is plural but the control is single-select radios, with nothing selected by default.

**Profile (`16-profile.png`)**
- The "Beneficiaries" segmented tab is a **dead end**: selecting it reveals a card that explains beneficiaries live on a different screen, plus a button to go there. The tab promises inline content and delivers a redirect.
- Stat tiles put the label *below* the value; the dashboard puts it *above*. Same component role, opposite structure.
- "TRANSACTIONS →" is styled as an uppercase micro-label but behaves as a link — mixed affordance.

**Login (`23-login.png`)**
- "Forgot password?" is rendered *inside* the password input, competing with the field's own tap target.
- No show/hide password toggle.
- "Continue with Google" is a dead control (`GAP_ANALYSIS.md` confirms it is UI-only on both clients).
- The "GG'APP" wordmark under the logo is very low contrast on navy.

---

# Part 3 — Redesign plan

Four phases. Phase 0 and 1 are prerequisites — do not start screen work before them, or the work gets redone.

## Phase 0 — Adopt the brand ✅ COMPLETE (July 26, 2026)

> Delivered: `src/theme/tokens.ts` rewritten on the logo's brand values; the
> `blue` / `blueInk` contrast split introduced; all four measured WCAG failures
> fixed; `textLight` darkened from 2.7:1 to 4.7:1; typeface moved to Figtree;
> every hardcoded hex tokenized except Google's brand mark. `NotifBanner` was
> made tone-driven — it had been hardcoded teal end-to-end, so a low-balance
> warning and a credit approval rendered identically apart from a 36px chip.
> `tsc --noEmit` clean. Details in the "What shipped" log at the end of this file.

### Original plan

Replace `src/theme/tokens.ts` wholesale. Anchor on the logo and the web's declared brand tokens, then add the mobile-only values the web doesn't need.

```ts
export const colors = {
  // ---- Brand: taken from the logo / gg-app "Core Brand" tokens ----
  navy900: '#050E22',   // scrims, deepest wells
  navy:    '#091C44',   // Core Brand Dark — logo field, headers, hero
  navy700: '#12244F',
  navy600: '#1A2F5E',   // raised surfaces sitting on navy

  blue:    '#38B6FF',   // Core Brand Accent — logo "G". Fills & on-navy only.
  blue400: '#5EC3FF',   // pressed state
  blue100: '#E6F5FF',   // tint fills, icon chips
  blueInk: '#0B72BB',   // 5.1:1 on white — links & small text on LIGHT surfaces

  // ---- Surfaces: warm alabaster, matching web ----
  bg:      '#FAF6F5',   // Core Brand Background
  card:    '#FFFFFF',
  surfaceMuted: '#F4F1F0',
  border:  '#EAE6E5',
  borderStrong: '#D5CFCF',

  // ---- Text ----
  text:      '#091C44',
  textSub:   '#2E3E5C',
  textLight: '#999DAD',

  // ---- Status: restrained, hue-distinct, all AA on their own tint ----
  success:   '#0E7C58',  successBg: '#E3F4EC',
  warning:   '#8A5200',  warningBg: '#FBF0DF',
  error:     '#C0333A',  errorBg:   '#FBEAEB',
  info:      '#0B72BB',  infoBg:    '#E6F5FF',
} as const
```

Notes on the deliberate choices:

- **`blue` vs `blueInk` is the core rule.** `blue` (#38B6FF) is 7.26:1 on navy and 2.28:1 on white. Use it for fills, active tab icons, progress bars, and text *on navy*. Use `blueInk` for every link and every sub-14px accent text on a light surface. This one split fixes every link-contrast failure in the app at once.
- **Status colours are deepened, not removed.** The web's `success → blue` mapping would make "Confirmed" and "Pending" the same hue. Keeping three distinguishable but desaturated hues preserves scannability while removing the bright green and yellow that currently break the palette. Every pair above clears 4.5:1 on its own tint.
- **Switch the typeface to Figtree** to match web, or move web to Plus Jakarta Sans. Either is defensible; pick one. Figtree is the smaller change since web already ships it and the mobile screens will be touched anyway.

Also in Phase 0: audit for hardcoded hexes. `DashboardScreen` alone contains `#0EA5A0`, `#22C98A`, `#8B5CF6`, `#EF4444` inline. All should become tokens.

## Phase 1 — Make the design system real (2–3 days)

**1. Use the type scale.** Add a `Txt` component (or extend `typography` with semantic roles) and migrate screens off hardcoded `fontSize`. Raise the floor: retire 9px and 10px entirely; the smallest label is 11px. Proposed roles — `display` 28, `h1` 22, `h2` 18, `title` 15, `body` 14, `bodySm` 13, `caption` 12, `label` 11 (uppercase, tracked).

**2. Add a spacing scale** (`4 / 8 / 12 / 16 / 20 / 24 / 32`) and use it. Current padding values are ad hoc (14, 16, 18, 20, 22).

**3. Fix `AppBar`:**
- Apply `useSafeAreaInsets().top` to `paddingTop`. This fixes the status bar on every screen at once.
- Render the back button only when `back` is truthy.
- Add a `variant` prop: `hero` (navy, tall, for tab roots) and `inline` (navy, compact, with back, for pushed screens).
- Pair with `<StatusBar style="light" />` wherever the bar is navy.

**4. One header language.** Every tab root gets the `hero` AppBar; every pushed screen gets `inline`. Profile stops being the odd one out. The Dashboard's decorative header becomes a `hero` variant with an extra slot, not a bespoke implementation.

**5. Build the missing primitives:** `StatTile` (label always above value), `StatusPill` (status semantics, not the current link-blue), `SectionHeader`, `MoneyText` (always formats with the country currency symbol — this kills the invoice bug at the component level), `StepIndicator`, `ChipGrid` (fixed-column, equal-width chips).

## Phase 2 — Close the functional gaps (3–4 days)

Ordered by risk.

**1. Legal screens.** Port `TermsScreen` / `PrivacyPolicyScreen` from web, reusing `termsContent.ts` and `privacyPolicyContent.ts` — move that content into a shared package so both clients read one source. Wire the two links in `RegisterScreen` as their own `Pressable`s that stop propagation to the checkbox. Add both to the Profile screen too. **Do this first; it is the app-store blocker.**

**2. Notification-derived banners with persistent dismissal.** Port the web's `getUnread*Items` selectors into shared code and rewrite the mobile banner block against them. Replace the in-memory `useState` dismissal with `AsyncStorage`, mirroring the web's seen-ID keys. Add the two missing banner families (prescription quote/ready, provider-cancelled appointment). This removes the "approved credit" banner that currently reappears on every launch.

**3. Dashboard search.** Add the search field to the Find a Service card, routing to `FindService` with a `q` param.

**4. Wire the Global Specialists row** to `FindService`.

**5. Dashboard appointments list** — render the filtered list like `DashboardAppointmentsCard`, not just `appointments[0]`.

**6. `StepIndicator` into PIN auth and booking.**

## Phase 3 — Screen redesigns (5–7 days)

**Dashboard.** Navy hero (logo, greeting, country, bell). Balance as a single full-width navy card — the accent blue on navy is the brand's strongest pairing and the balance is the most important number in the app. Spent/Next Appointment as a 2-up `StatTile` row below. Banner stack capped at two visible with an "N more" affordance. Find a Service with search + 3-up category grid matching the Services tab exactly.

**Find a Service.** Split the search bar and the "Verified Network" badge into two elements. Move to the same 3-up compact category grid as the dashboard so all six fit without scrolling; move the descriptions into the provider-list screen where there's room.

**Provider profile.** Remove the duplicated address (header keeps name + suburb only) and the duplicated Open status. Restyle stars to navy/blue. Sticky bottom CTA bar for "Book" / "Request Prescription" instead of requiring a scroll.

**Invoices.** `MoneyText` everywhere — currency symbol restored. Invert the row hierarchy: provider + service in `title`, invoice ID demoted to `caption`. `StatusPill` with real status semantics. Drop the redundant card title; the active chip already states the filter.

**Booking form.** Hide the tab bar for the booking stack. Group time slots under "Morning / Afternoon / Evening" headers in a fixed 4-column `ChipGrid` with equal-width chips. Sticky submit CTA. Add the step indicator. Default-select the service type when a provider offers only one, and rename the section to the singular.

**Profile.** Add the `hero` AppBar. Either render beneficiaries inline in the tab or remove the tab and promote the dedicated screen to a normal row — the current redirect-card is the worst of both. `StatTile` for the four stats (labels above values). Make the transactions link a real link, not a caps label.

**Login.** Move "Forgot password?" below the field. Add a show/hide toggle. Either wire Google OAuth or remove the button until it works. Drop the emoji. Lift the wordmark contrast.

## Suggested sequence

Phase 0 → Phase 1 → **Phase 2 item 1 (legal)** → rest of Phase 2 → Phase 3. Phase 0 and 1 are cheap and make everything after them faster; the legal fix is small and jumps the queue on compliance risk alone.

## What to measure afterwards

- Zero WCAG AA failures on text/background pairs (the four in §2.2 are the current baseline).
- Zero `fontSize:` literals outside `theme/`.
- Zero hex literals outside `theme/tokens.ts`.
- One header component, two variants, used by every screen.
- Mobile and web screenshots of the same route are recognisably the same product.

---

# What shipped

## Phase 0 — Adopt the brand · July 26, 2026

**Files changed:** `src/theme/tokens.ts`, `src/theme/typography.ts`, `App.tsx`,
`package.json`, `src/components/NotifBanner.tsx`, `src/components/GGPill.tsx`,
`src/components/Stars.tsx`, `src/components/HealthNewsSection.tsx`,
`src/screens/home/DashboardScreen.tsx`, `src/screens/home/EmptyDashboardScreen.tsx`,
`src/screens/credit/{CreditWallet,CreditApply,CreditInitialApply,CreditIncrease}Screen.tsx`,
`src/screens/payments/{InvoiceReview,PaymentSuccess,PINAuth}Screen.tsx`,
`src/screens/services/{ProviderList,ProviderProfile,BookingForm,PrescriptionRequest,PrescriptionRequests,PrescriptionConfirm,PrescriptionDetail}Screen.tsx`,
`src/screens/profile/BeneficiariesScreen.tsx`, `src/screens/auth/LoginScreen.tsx`,
`assets/fonts/DOWNLOAD_FONTS.md`.

### Contrast failures fixed

| Where | Before | After |
|---|---|---|
| `textLight` on white | `#999DAD` — 2.7:1 | `#6A7490` — 4.7:1 |
| Warning pills ("Coming Soon") | `#F5A623` on `#FFF6E5` — 2.0:1 | `#8A5200` on `#FBF0DF` — 5.6:1 |
| "Authorized" invoice pill | `blue` on `blue3` — 2.0:1 | `info` on `infoBg` — 4.6:1 |
| Wallet "78%" and month usage | `blue2` on light — ~2.4:1 | `blueInk` — 5.1:1 |
| Success pills | `#1FBE86` — 2.4:1 | `#0E7C58` — 4.6:1 |

### Token changes

- Brand realigned to the logo: `navy #091C44`, `blue #38B6FF`, `bg #FAF6F5`,
  `border #EAE6E5`. Shadows recoloured off `#011F4A`.
- **`blue` / `blueInk` split added** — the central rule. `blue` is 7.3:1 on navy
  and 2.3:1 on white, so it is now fills-and-on-navy only; `blueInk #0B72BB`
  (5.1:1 on white) carries links and small accent text on light surfaces.
- Status colours deepened and kept hue-distinct rather than adopting the web's
  `success → blue` collapse, which would make Confirmed and Pending the same hue.
- Removed unused `navy3`, `hero`, `surface`, `action`. Removed `navy2` and
  `blue2`, migrating their 7 call sites to the semantically correct token.
- `blue3` retained as a **deprecated alias** for `blue100` — 68 call sites across
  33 files, all `backgroundColor`. Deliberately deferred to Phase 1 so each file
  is opened once for both the typography migration and this rename, not twice.

### Typeface

Plus Jakarta Sans → **Figtree**, matching the PWA's design system. Added
`@expo-google-fonts/figtree@^0.4.1`, removed `@expo-google-fonts/plus-jakarta-sans`
(nothing imported it after the swap). All five weights map 1:1, so no screen
needed a weight change. `assets/fonts/DOWNLOAD_FONTS.md` had stale instructions to
hand-place `.ttf` files into an empty folder; rewritten to describe the real setup.

### Component fixes

- **`NotifBanner` is now tone-driven** (`success` / `info` / `warning` / `error` /
  `purple`). Its container, title, body, dismiss and CTA had all been hardcoded
  teal, so the tone was expressed only in a 36px icon chip — every dashboard
  banner read as teal regardless of meaning. The seven dashboard banners now
  carry their real semantics.
- `Stars` and the interactive review control moved off amber `#F5A623` to
  `blueInk` (stars are graphical, needing 3:1; `blue` at 2.3:1 would not qualify).
- Every remaining hardcoded hex mapped to a token. The only literals left outside
  `src/theme/` are Google's four brand-mark colours in `LoginScreen`, now
  commented as a deliberate exemption.

### Verification

- `npx tsc --noEmit` — clean (exit 0).
- `npx expo export --platform android` — clean (exit 0), both plain-JS (2.4 MB)
  and Hermes bytecode (3.6 MB). The Figtree `.ttf` assets are confirmed present
  in the export manifest.
- Not yet confirmed: **the app has not been launched and looked at** since the
  palette change. Bundling proves it compiles, not that it looks right. Worth a
  device smoke test before Phase 1.

### Bundler out-of-memory fix (same session)

Bundling initially failed with `Jest worker ran out of memory and crashed`, and
`expo export` died in `hermesc.exe` and then in Node's heap. None of this was
caused by the Phase 0 edits — the dev machine has 16 cores but was down to
0.8 GB free RAM (emulator, browser and two editors resident). Metro defaults to
about one transformer worker per core, so ~15 worker threads, each with its own
V8 heap, were competing for memory that was not there.

`metro.config.js` now sets `config.maxWorkers = 3`, overridable with
`METRO_MAX_WORKERS`. Both export paths went from crashing to exit 0 with no
other change. If it recurs, the cause is free RAM rather than the bundler —
close the emulator or browser, or lower the cap further.
