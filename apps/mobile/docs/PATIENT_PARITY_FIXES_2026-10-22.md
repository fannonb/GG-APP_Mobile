# Mobile patient parity fixes

Implemented October 22, 2026 against the [current workspace audit](../../../../docs/PATIENT_WEB_MOBILE_PARITY_AUDIT_2026-10-22.md).

## Changes

- Prescription list/detail totals now include delivery fees. Detail separates medicine subtotal, delivery and total; the shared request contract includes `deliveryFee`.
- Prescription detail explains pharmacy rejection, displays the reason, offers another pharmacy, and shows order progress. Paid/authorized orders offer a receipt; closed orders do not request payment.
- Receipt links load invoice data before presenting payment success. Missing/unpaid invoices have appropriate loading, retry or review states.
- Credit status uses the application decision ahead of the existing account status. This fixes rejected or pending increases appearing approved on an existing approved account. Decline reasons, decision dates, status colours and actual finance-partner names are shown.
- Provider-category fetch failures have an error/retry state instead of claiming no providers exist. Failed refreshes retain previous results. Prescription and invoice detail failures also have recovery states.
- The Health Ledger has a self-only summary of latest nonempty vitals and up to five recent medicine names from the last 90 days. Beneficiary records do not contribute to the patient's summary.
- Native session bootstrap preserves saved sessions on connectivity/server failure. Explicit invalid-session responses clear tokens, patient stores, query state and saved cache.
- Patient read queries can be restored after a native offline restart. The UI shows connection/saved-data status; offline mutations are rejected instead of queued for later execution.
- Native foreground/reconnect handling validates the session and refreshes patient queries. The public backend health endpoint is probed on launch, foreground and every 30 seconds while active. No third-party connectivity probe is used.
- Patient tabs require a patient session role. Increase-status links retain their request type. Push taps use one root navigation route, are held until navigation/session readiness, and recover the tap that launched a terminated app.
- Concurrent token refreshes are deduplicated. Network/server refresh failures preserve tokens; logout/account changes cannot be undone by a late refresh response.

## Offline storage behavior

Uses the existing `expo-crypto`, `expo-secure-store`, and `expo-file-system` dependencies. Successful allowlisted reads are encrypted with AES-GCM; the encryption key stays in SecureStore and is limited to the unlocked device on iOS. Persistence is debounced and limited to 2 MB of plaintext and seven days of age. Cache files are stored in the app cache directory, so the OS may evict them.

Cache restoration is scoped to the backend URL, patient role and JWT subject. The subject is used only for storage isolation; it is not treated as authentication. An explicit backend authentication rejection still invalidates the session.

PIN/grant/access-log status, attachment queries, device-local/data file contents, credentials and mutations are not restored. Logout cancels pending cache writes and removes the file and its key. No plaintext persistence fallback is used if secure storage/encryption fails. Native cache persistence is skipped on the Expo web target and for mock tokens without a patient JWT subject.

## Checks

- `npm.cmd run typecheck` from `gg-monorepo` — passed.
- `npm.cmd run test:patient` from `gg-monorepo` — 20 tests passed. Covers financial decisions, quote pricing, prescription actions, rendered screen messages, self/beneficiary summary separation, cache scoping/encryption/cleanup, offline payment blocking, refresh concurrency/failure/logout races, and notification routing/cold-start delivery.
- Expo Android JavaScript export (`expo export --platform android --no-bytecode`) — passed, 1,775 modules.
- Hermes bytecode export was attempted but its compiler could not write the temporary `.hbc` file because of sandbox permissions. The JavaScript export does not establish a successful native release build.
- Native encryption/storage, Android/iOS layout, background/foreground recovery and notification delivery still need testing on an installed native build against a test backend. Node tests substitute platform adapters; they do not run the device keystore or native notification module.

No dependency installation, backend migration, backend feature change, web-client change, deployment or APK publication was performed. The mock-only web repayment schedule remains outside this implementation.

## Device verification

1. Submit a delivery prescription quote and confirm subtotal + fee = invoice total; also check pickup and absent/zero fee.
2. Reject an initial credit application and an increase on an already approved account. Confirm the reason and partner name appear without marking the increase approved.
3. Open a rejected prescription, a paid prescription and an unpaid receipt link. Check the explanation and next action for each.
4. Load patient data online, restart in airplane mode, confirm saved reads and the connection banner, then reconnect. Attempting payment offline must fail immediately and must never execute automatically on reconnect.
5. Log out, sign in as a different test patient and confirm the previous patient's cached data is absent.
6. Stop the API and open provider/invoice/prescription screens; confirm failure messages rather than empty-directory claims or indefinite spinners.
7. Open notifications while running, backgrounded, terminated and logged out. Verify receipt, increase-status and ledger destinations after session restoration/login.
8. Confirm the ledger summary uses the patient's own vitals/medicines, excludes family members and excludes prescriptions older than 90 days.
