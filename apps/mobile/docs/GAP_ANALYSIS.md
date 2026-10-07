# GG'APP Mobile vs PWA — Patient Parity Status

**Last updated:** July 11, 2026

This document tracks patient-side feature parity between the **PWA** (`gg-app`) and **mobile app** (`gg-monorepo/apps/mobile`).

---

## Summary

| Area | Status |
|------|--------|
| Auth & onboarding | **Parity** |
| Dashboard & notifications | **Parity** (mobile has pull-to-refresh) |
| Find service & booking | **Parity** (live search on both) |
| Appointments & reschedule | **Parity** (Book Again / Rebook on both) |
| Invoices & split payment | **Parity** |
| Credit & wallet | **Parity** |
| Profile, security, beneficiaries | **Parity** |
| Prescription requests list | **Parity** |
| Session refresh on launch | **Parity** |

**Estimated patient parity: ~95%**

---

## Recently completed (P0 + P1 + P2)

### P0 — Critical parity
- Split / partial invoice payment (wallet + off-app remainder)
- Shared package sync (`shared-types`, `shared-api`, `shared-hooks`)
- Mobile invoice review, PIN auth, payment success flows
- Change password on mobile Security screen
- Beneficiaries enable/disable toggle
- Find Service live search on mobile

### P2 — Remaining alignment
- **Book Again / Rebook** — uses `GET /patient/appointments/:id/rebook` with local fallback
- **Session bootstrap** — mobile refreshes tokens and hydrates profile + notifications on launch
- **PWA prescription requests list** — `/app/prescriptions` screen + nav item
- **TypeScript fix** — `DatePickerModal` `absoluteFill` API

---

## Remaining minor gaps (both or low priority)

| Feature | PWA | Mobile | Notes |
|---------|-----|--------|-------|
| Google OAuth | UI only | UI only | Neither wired end-to-end |
| Email verification | Informational | Informational | No real code-entry flow |
| Patient appointment detail | No dedicated screen | No dedicated screen | List views only |
| News article modal | Full modal | Limited tap handling | Cosmetic |
| Ad banners | Mock | Mock component | Admin-controlled later |
| Global Specialists | Coming soon | Coming soon | Intentional |

---

## Architecture note

- **PWA** uses local `src/api` and `src/hooks`
- **Mobile** uses monorepo packages: `@gg/shared-api`, `@gg/shared-hooks`, `@gg/shared-types`, `@gg/shared-utils`, `@gg/shared-stores`

When adding patient features, update **shared packages first**, then wire mobile screens. Port PWA-only changes into shared packages to keep both clients aligned.

---

## Screen inventory

| Client | Patient screens | Navigation |
|--------|-----------------|------------|
| Mobile | 34 screens | 5 bottom tabs |
| PWA | ~36 screens | Sidebar + routes |

---

*The detailed legacy gap tables below are kept for historical reference but may be outdated. Prefer the summary above.*
