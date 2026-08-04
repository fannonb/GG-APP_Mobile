# Patient Web vs Mobile Parity Audit

Date: July 24, 2026

## Compared apps

- Web: `gg-app`
- Mobile: `gg-monorepo/apps/mobile`

## Confirmed patient parity fixes completed in web

### 1. Notification read-state persistence

The web patient notifications page was only marking items as read in local component state.
Mobile already persists reads through the shared backend.

Completed:

- wired the web notifications screen to `usePatientNotifications`
- wired read actions to `useMarkPatientNotificationReadMutation`
- wired "mark all read" to backend-backed mutation calls

### 2. Notification routing parity

The web patient notifications page and drawer still contained placeholder routing, including a hard-coded invoice route.
Mobile already routes notifications by backend-provided screen data with sane fallbacks.

Completed:

- added shared patient notification route resolution
- removed hard-coded invoice destination behavior
- aligned both the notifications screen and notification drawer to the same route resolver

### 3. Beneficiary mutation contract alignment

The web patient beneficiary mutation hooks still typed payloads without `countryCode`, even though the UI and backend both require it.

Completed:

- updated beneficiary mutation hook typing to use `UpsertBeneficiaryPayload`

### 4. Patient navigation label alignment

Mobile patient bottom tab uses `Wallet`.
Web patient navigation still used `Allocation`.

Completed:

- changed web patient sidebar and mobile-bottom-nav label to `Wallet`

## Confirmed feature parity already present on web

These patient capabilities already exist in the web app:

- dashboard and new-user dashboard
- appointments and reschedule review
- provider search and provider profile
- pharmacy prescription request flow
- invoice review, PIN auth, and payment success
- credit wallet, credit apply, credit increase, and credit status
- profile editing with residence country
- beneficiary create, edit, delete, and enable/disable
- payment PIN flow and password change
- provider map block and provider logo lightbox

## Remaining differences that are mostly information architecture, not missing backend features

### 1. Credit application journey shape

- Mobile keeps separate `CreditInitialApply` and `CreditApply` screens.
- Web uses `CreditDisclaimer` plus a richer `CreditApply` screen.

Current assessment:
Feature parity exists, but the journey is structured differently.

### 2. Profile structure

- Mobile uses separate `Profile`, `Beneficiaries`, `Notifications`, and `SecurityPIN` screens.
- Web consolidates profile, beneficiaries, and security into tabbed sections under one profile route.

Current assessment:
Feature parity exists, but the IA is different.

### 3. Prescription request entry point

- Mobile has a dedicated `PrescriptionRequestScreen`.
- Web embeds the prescription request workflow inside the pharmacy provider profile.

Current assessment:
Feature parity exists, but the entry model is different.

## Current blocker outside this parity work

`npm run build` still fails because of pre-existing TypeScript issues outside this notification parity patch.

Examples include:

- `src/api/services/sp.service.ts`
- `src/features/auth/components/PatientRegisterFlow.tsx`
- `src/features/patient/components/PharmacyPrescriptionUpload.tsx`
- `src/features/patient/PrescriptionDetailScreen.tsx`
- `src/features/service-provider/prescriptions/SPPrescriptionDetailScreen.tsx`
- `src/mock/admin.mock.ts`
- `src/utils/invoice-attachment.ts`

These errors were already present and are not caused by the notification parity changes.
