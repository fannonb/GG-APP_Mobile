# Patient Feature Parity Implementation Plan

## Purpose

This document turns the current patient-side web-to-mobile gap analysis into a build-ready implementation plan for the mobile app in `apps/mobile`.

The goal is to close the most important patient-facing feature gaps between:

- Web patient experience in `gg-app/src/features/patient`
- Mobile patient experience in `gg-monorepo/apps/mobile/src`

This plan is intentionally detailed so it can be used as:

- an execution checklist
- a handoff document
- a sequencing guide for implementation and QA

## Scope

This plan covers the confirmed feature gaps identified during the comparison:

1. Dedicated credit increase flow on mobile
2. Residence country editing on mobile profile
3. Beneficiary country capture and display on mobile
4. Missing `Invoices` and `Credit` filters in mobile notifications
5. Embedded provider map on mobile provider profile
6. Provider logo lightbox / enlarged brand image interaction on mobile

It also includes rollout order, file-level touch points, QA coverage, and acceptance criteria.

## Out of Scope

The following items are not treated as missing core functionality and are therefore not part of the first implementation wave:

- New-user dashboard: already exists on mobile
- Appointment flows: already exist on mobile
- Prescription request tracking: already exists on mobile
- Payment PIN and password management: already exists on mobile
- Review submission: already exists on mobile

These may still receive UI polish later if needed.

## Source of Truth

### Web reference files

- `D:\App Projects\GG_APP (4)\GG'APP Local Package\GG'APP\gg-app\src\router\PatientRouter.tsx`
- `D:\App Projects\GG_APP (4)\GG'APP Local Package\GG'APP\gg-app\src\features\patient\credit\CreditIncreaseScreen.tsx`
- `D:\App Projects\GG_APP (4)\GG'APP Local Package\GG'APP\gg-app\src\features\patient\ProfileScreen.tsx`
- `D:\App Projects\GG_APP (4)\GG'APP Local Package\GG'APP\gg-app\src\features\patient\NotificationsScreen.tsx`
- `D:\App Projects\GG_APP (4)\GG'APP Local Package\GG'APP\gg-app\src\features\patient\ProviderProfileScreen.tsx`

### Mobile implementation files

- `D:\App Projects\GG_APP (4)\GG'APP Local Package\GG'APP\gg-monorepo\apps\mobile\src\navigation\types.ts`
- `D:\App Projects\GG_APP (4)\GG'APP Local Package\GG'APP\gg-monorepo\apps\mobile\src\navigation\WalletStack.tsx`
- `D:\App Projects\GG_APP (4)\GG'APP Local Package\GG'APP\gg-monorepo\apps\mobile\src\screens\credit\CreditApplyScreen.tsx`
- `D:\App Projects\GG_APP (4)\GG'APP Local Package\GG'APP\gg-monorepo\apps\mobile\src\screens\profile\ProfileScreen.tsx`
- `D:\App Projects\GG_APP (4)\GG'APP Local Package\GG'APP\gg-monorepo\apps\mobile\src\screens\profile\BeneficiariesScreen.tsx`
- `D:\App Projects\GG_APP (4)\GG'APP Local Package\GG'APP\gg-monorepo\apps\mobile\src\screens\profile\NotificationsScreen.tsx`
- `D:\App Projects\GG_APP (4)\GG'APP Local Package\GG'APP\gg-monorepo\apps\mobile\src\screens\services\ProviderProfileScreen.tsx`

## Delivery Strategy

### Recommended rollout

1. Must-have functional parity
2. Nice-to-have provider detail enhancements
3. UI copy and polish pass
4. Regression testing across patient flows

### Recommended implementation order

1. Credit increase flow
2. Profile residence country
3. Beneficiary country support
4. Notification filters
5. Provider embedded map
6. Provider logo lightbox

This order is recommended because:

- credit and profile changes are the highest-value functional gaps
- beneficiary country depends on related profile/country handling decisions
- notification filters are small and low-risk
- provider enhancements are more visual and can be delivered after parity-critical work

## Phase Breakdown

### Phase 1: Must-Have Functional Parity

- Workstream A: Dedicated credit increase flow
- Workstream B: Residence country editing in profile
- Workstream C: Beneficiary country support
- Workstream D: Notification filter parity

### Phase 2: Nice-To-Have Patient Experience Parity

- Workstream E: Embedded provider map
- Workstream F: Provider logo lightbox

### Phase 3: UI Copy and Consistency

- Beneficiary lock/unlock wording
- Credit increase guidance copy
- Country labeling consistency

## Workstream A: Dedicated Credit Increase Flow

### Goal

Create a dedicated mobile flow for increasing an existing credit limit so it matches the web model more closely instead of reusing the generic `CreditApply` route.

### Current mobile state

- Mobile wallet navigation currently exposes:
  - `CreditWallet`
  - `CreditDisclaimer`
  - `CreditInitialApply`
  - `CreditApply`
  - `CreditStatus`
  - `TransactionHistory`
- Mobile `CreditApplyScreen` already calls `useIncreaseCreditMutation`, but it behaves like a repurposed increase form rather than a dedicated increase journey.

### Web parity target

The mobile flow should mirror the intent of the web increase flow, including:

- separate entry point for requesting a limit increase
- pending-review handling specific to increase requests
- increase amount preview
- admin fee disclosure and net disbursed amount preview
- explicit consent copy
- "what happens next" guidance

### Files to update

- `src/navigation/types.ts`
- `src/navigation/WalletStack.tsx`
- `src/screens/credit/CreditApplyScreen.tsx`
- `src/screens/credit/CreditWalletScreen.tsx`
- `src/screens/home/DashboardScreen.tsx`
- `src/screens/profile/NotificationsScreen.tsx`

### Files to create

- `src/screens/credit/CreditIncreaseScreen.tsx`

### Navigation changes

- Add a dedicated `CreditIncrease` route to `WalletStackParamList`
- Register `CreditIncrease` in `WalletStack`
- Update entry points that currently go to `CreditApply` for increase-only scenarios

### Entry points to rewire

- Low-balance CTA on dashboard
- Wallet screen CTA for requesting more credit
- Any credit-related notification CTA that should land on the increase flow

### Screen behavior requirements

#### Initial state

- Show current credit limit
- Show available balance
- Show finance partner name if available from current user/credit data
- Show short explanation of what an increase request does

#### Form fields

- increase amount
- monthly income
- reason for increase
- optional notes
- required consent checkbox

#### Validation

- minimum increase threshold
- maximum total limit threshold
- income must be numeric and positive
- reason required
- consent required

#### Derived preview block

- requested increase
- estimated admin fee
- estimated net wallet amount after fee
- resulting total limit if approved

#### Pending state handling

- If there is already a pending increase request:
  - disable resubmission
  - show a clear pending banner/card
  - route user to status screen

#### Submission behavior

- Submit through `useIncreaseCreditMutation`
- Route to `CreditStatus` after success
- Prefer adding a route param or status-mode param if `CreditStatus` needs to render increase-specific messaging

### Suggested route typing improvement

Current:

```ts
CreditStatus: undefined
```

Suggested:

```ts
CreditStatus: { requestType?: 'application' | 'increase' } | undefined
CreditIncrease: undefined
```

This is optional, but recommended if the status screen needs context-aware copy.

### Shared dependency checks

Before implementation, confirm mobile has access to:

- finance partner summary helper or equivalent
- current application type from `useCreditStatus`
- enough status data to distinguish `increase` vs initial application

If not, a shared-layer enhancement may be required in:

- `@gg/shared-hooks`
- `@gg/shared-types`
- `@gg/shared-utils`
- `@gg/shared-config`

### Acceptance criteria

- Users can reach a dedicated increase screen from wallet/dashboard
- Increase requests do not reuse the initial application journey
- Fee disclosure and next-step guidance are visible
- Pending increase requests are blocked from duplicate submission
- Successful submission transitions to status view

### QA checklist

- Existing approved user with available credit can open increase flow
- User with pending increase request sees pending state, not editable form
- Invalid amount shows validation
- Missing consent blocks submission
- Successful submission navigates correctly
- Dashboard low-balance CTA points to increase flow, not generic apply

## Workstream B: Residence Country Editing in Profile

### Goal

Allow mobile patients to edit their residence country so profile parity matches the web experience.

### Current mobile state

- `ProfileScreen` edit form currently updates:
  - `name`
  - `email`
  - `phone`
- Country is displayed but not editable.

### Web parity target

Mobile profile should support:

- editable residence country
- clear distinction between residence country and wallet market country when relevant
- supporting copy for users living inside or outside the operating markets

### Files to update

- `src/screens/profile/ProfileScreen.tsx`

### Likely dependency additions

If not already available in mobile shared imports, bring in:

- world country option list or supported residence country list
- country resolver helpers
- market-country display helpers

These may need to mirror web behavior if mobile does not yet consume them.

### UI changes

#### Edit form

Add:

- residence country selector

Keep existing fields:

- full name
- email
- phone

#### Read-only profile summary

Display:

- country of residence
- market country
- currency

This is especially important if residence country and wallet market differ.

### Data contract expectations

Profile update payload should support:

- `residenceCountryCode`
- possibly `residenceCountryName`

If mobile mutation currently only accepts basic identity fields, update the shared mutation contract or payload typing as needed.

### Validation rules

- residence country must be selected
- existing required profile validations remain unchanged

### Acceptance criteria

- User can edit and save residence country from the mobile profile
- Updated value is visible after save
- Profile summary reflects residence-country changes
- If residence country is outside supported wallet markets, explanatory copy remains understandable

### QA checklist

- Save within operating market
- Save outside operating market
- Verify summary reflects correct residence country
- Verify no regressions to existing name/email/phone editing

## Workstream C: Beneficiary Country Support

### Goal

Add beneficiary country capture and display so the mobile beneficiaries flow matches the web feature set.

### Current mobile state

Mobile beneficiaries currently support:

- name
- relation
- date of birth
- national ID

But not:

- country of residence for each beneficiary

### Web parity target

Each beneficiary should include:

- country of residence
- visible display of that country in beneficiary list/details

### Files to update

- `src/screens/profile/BeneficiariesScreen.tsx`
- `src/screens/services/BookingFormScreen.tsx`

### Why `BookingFormScreen` is included

If beneficiary country becomes part of the supported data model, booking UX may need to:

- show fuller beneficiary context
- enforce any future country-based restrictions
- display country where useful

This is optional for first implementation, but should be reviewed.

### UI changes in beneficiary management

#### Add/edit form

Add:

- country of residence selector

#### Beneficiary card/list item

Display:

- selected beneficiary country
- optional flag if the design system supports it consistently

### Validation rules

- country becomes required
- keep existing relation and name validation
- maintain current DOB and ID validation behavior

### Backend/shared data expectations

Confirm that beneficiary payloads support:

- `countryCode`

If the shared mutation/type layer does not fully expose it on mobile, update shared contracts before or during implementation.

### Edge-case behavior

- Existing beneficiaries without a country should still render safely
- Old records may need fallback copy like `Not provided`
- Edit flow should allow setting a missing country on legacy records

### Acceptance criteria

- User can create a beneficiary with country
- User can edit an existing beneficiary's country
- Beneficiary country is visible in list/details
- Existing beneficiaries without country do not break rendering

### QA checklist

- Create beneficiary with valid country
- Edit existing beneficiary and change country
- Remove beneficiary still works
- Toggle beneficiaries on/off still works
- Booking for beneficiary still works after data model change

## Workstream D: Notification Filter Parity

### Goal

Add the missing `Invoices` and `Credit` notification filters to mobile.

### Current mobile state

Mobile already supports notification type handling for:

- appointment
- payment
- invoice
- credit

But the chip/filter row only exposes:

- All
- Unread
- Appointments
- Payments

### Web parity target

Expose the same filter set as web:

- All
- Unread
- Appointments
- Payments
- Invoices
- Credit

### Files to update

- `src/screens/profile/NotificationsScreen.tsx`

### Implementation tasks

- Expand the chip list
- Expand the filter-to-type map
- Ensure counts are computed for new chips
- Confirm empty-state copy still makes sense for all categories

### Behavior already present

The mobile screen already routes invoice/payment/credit notifications correctly, so this work is mostly UI/filter logic and should be low risk.

### Acceptance criteria

- `Invoices` chip shows only invoice notifications
- `Credit` chip shows only credit notifications
- Counts update correctly
- Mark-all-read still works across all filters

### QA checklist

- Filter by invoice only
- Filter by credit only
- Verify unread counts across filters
- Verify tap navigation still works from filtered lists

## Workstream E: Embedded Provider Map

### Goal

Show an embedded map or map preview inside the mobile provider profile, instead of relying only on external map apps.

### Current mobile state

Mobile provider profile currently supports:

- open directions
- open in maps

But it does not show an in-screen map view.

### Web parity target

Web includes an inline provider map component in the provider profile.

### Files to update

- `src/screens/services/ProviderProfileScreen.tsx`

### Files to create

One of the following, depending on implementation choice:

- `src/components/provider/ProviderLocationMap.tsx`
- or similar map-preview component path

### Implementation options

#### Option 1: Static map preview plus external actions

Pros:

- simpler
- lower native integration risk
- likely faster to ship

Cons:

- less interactive than full embedded map

#### Option 2: Full embedded map component

Pros:

- closest parity with web
- richer in-app browsing

Cons:

- higher setup and testing cost
- possible dependency and platform behavior complexity

### Recommendation

Ship a lightweight embedded map preview first if native map dependency risk is high, then upgrade to a fully interactive map if needed.

### UX requirements

- Show provider location section inline
- Preserve existing `Get Directions` and `Open in Maps` actions
- Gracefully handle providers without coordinates
- Fall back to address-only state if coordinates are missing

### Acceptance criteria

- Provider profile includes visible in-app location block
- Existing external map actions continue to work
- No crash when provider has partial or missing geo data

### QA checklist

- Provider with valid coordinates
- Provider with address but missing coordinates
- Android map links still open correctly
- iOS route handling remains supported if app becomes cross-platform in this area

## Workstream F: Provider Logo Lightbox

### Goal

Allow the patient to tap a provider logo/avatar and view it in a larger focused view.

### Current mobile state

- Mobile provider profile uses a regular avatar/header presentation
- No enlarge/zoom behavior exists

### Web parity target

Web provider profile supports a logo popup/lightbox interaction for branded providers.

### Files to update

- `src/screens/services/ProviderProfileScreen.tsx`

### Likely implementation shape

- Add local state for lightbox visibility
- Use a modal overlay
- Render:
  - enlarged logo if `logoUrl` exists
  - fallback initials if not
- Close on tap outside or explicit dismiss control

### UX requirements

- Only enable tap-to-expand when a provider logo/image exists
- Provide accessible close behavior
- Keep background interaction disabled while modal is open
- Avoid layout jump when opening/closing

### Acceptance criteria

- Branded providers can be enlarged in a modal/lightbox
- Providers without images do not show broken interaction
- Modal can be dismissed reliably

### QA checklist

- Provider with logo
- Provider without logo
- Open and close repeatedly
- Test on smaller device sizes

## Cross-Cutting Considerations

### Shared package dependency review

The mobile app imports heavily from shared packages such as:

- `@gg/shared-hooks`
- `@gg/shared-stores`
- `@gg/shared-types`
- `@gg/shared-utils`
- `@gg/shared-config`

Before implementation begins, verify whether the missing behavior can be completed entirely inside `apps/mobile` or whether shared packages must be extended.

### Likely shared dependency hotspots

- credit status payload shape for increase requests
- finance partner helper data
- profile update payload typing for residence country
- beneficiary payload typing for `countryCode`

### Backward compatibility

Where new fields are introduced:

- render safely for older data
- avoid assuming all existing records are fully populated
- add fallback copy instead of hard failures

### Analytics and event tracking

If the mobile app tracks patient funnel events, consider adding tracking for:

- opened credit increase screen
- submitted credit increase request
- updated residence country
- added beneficiary country
- tapped invoice notifications filter
- tapped credit notifications filter
- opened provider map preview
- opened provider logo modal

If no analytics layer exists yet, this can be deferred.

## Suggested Task Breakdown

### Sprint 1

- Add `CreditIncrease` route and screen
- Rewire increase-related entry points
- Add residence country selector to profile

### Sprint 2

- Add beneficiary country support
- Add notification filters for `Invoices` and `Credit`

### Sprint 3

- Add embedded provider map
- Add provider logo lightbox
- Run final parity QA pass

## Detailed Acceptance Checklist

### Credit increase

- Dedicated route exists
- Dashboard CTA lands on correct screen
- Wallet CTA lands on correct screen
- Pending increase requests are recognized
- Fee preview is visible
- Consent is required
- Success routes to status

### Profile residence country

- Country is editable
- Country persists after save
- Summary reflects updated country
- No regression to existing profile edit flow

### Beneficiary country

- Add flow supports country
- Edit flow supports country
- Existing rows render safely
- Country is visible in list/details

### Notifications

- `Invoices` filter exists
- `Credit` filter exists
- Counts are correct
- Filtering does not break read state or navigation

### Provider profile

- Embedded location block renders
- External map actions still work
- Logo modal opens for providers with images
- No broken state for providers without images

## Regression Test Matrix

### Wallet and credit

- Initial credit application still works
- Credit wallet still opens
- Credit status still opens
- Transaction history still opens

### Profile

- Edit personal details still works
- Beneficiary toggle still works
- Security PIN flow still works
- Password change still works

### Services

- Find service still works
- Provider profile still loads
- Booking form still works for self
- Booking form still works for beneficiary
- Prescription upload flow still works

### Notifications

- Mark-all-read still works
- Notification tap targets still route correctly

## Risks

### Medium risk

- Shared hook/type contracts may need updates outside `apps/mobile`
- Credit status may not expose enough detail for increase-specific state
- Country field additions may expose legacy-data inconsistencies

### Low risk

- Notification filter additions
- Provider logo lightbox

### Design/UX risk

- Embedded map choice may create native dependency overhead if implemented as a fully interactive map too early

## Final Recommendation

Implement Phase 1 first without waiting for provider-profile visual parity. The biggest patient-side value comes from:

- correct credit increase flow
- correct profile country handling
- correct beneficiary country handling
- complete notifications filtering

Once those land, move to provider enhancements and a final polish pass.

## Suggested Definition of Done

This parity effort should be considered complete when:

- all Phase 1 acceptance criteria pass
- no patient-side regressions are found in booking, invoices, profile, or wallet flows
- provider enhancements are either delivered or explicitly deferred with product sign-off
- the mobile app no longer lacks any confirmed high-priority patient features from the web comparison

