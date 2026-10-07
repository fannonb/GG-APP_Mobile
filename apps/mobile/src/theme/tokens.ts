/**
 * GG'APP brand tokens.
 *
 * Anchored on the logo and kept in sync with the PWA's "Core Brand" tokens
 * (`gg-app/src/design-system/tokens.ts`). The two clients must not drift again.
 *
 *   Core Brand Dark        #091C44   the logo's navy field
 *   Core Brand Accent      #38B6FF   the logo's "G"
 *   Core Brand Background  #FAF6F5   warm alabaster
 *
 * CONTRAST RULE — the single most important thing in this file.
 * The brand accent is 7.3:1 on navy and only 2.3:1 on white. It is a superb
 * on-navy colour and an unusable on-white text colour.
 *
 *   `blue`     fills, active tab icons, progress bars, and text ON NAVY
 *   `blueInk`  every link and every sub-14px accent text on a LIGHT surface
 *
 * Every text/background pair defined below clears WCAG AA (4.5:1) against its
 * intended surface. Ratios are noted so they survive future edits.
 */
export const colors = {
  /* ---- Brand: navy ---------------------------------------------------- */
  navy900: '#050E22', // scrims, deepest wells
  navy:    '#091C44', // Core Brand Dark — headers, hero surfaces, primary text
  navy700: '#12244F',
  navy600: '#1A2F5E', // raised surfaces sitting on navy

  /* ---- Brand: accent -------------------------------------------------- */
  blue:    '#38B6FF', // Core Brand Accent. Fills + on-navy only (7.3:1 on navy)
  blue400: '#5EC3FF', // pressed / hover, and accent text on navy
  blue100: '#E6F5FF', // tint fills, icon chips
  blueInk: '#0B72BB', // links + small accent text on light (5.1:1 on white)

  /* ---- Surfaces: warm alabaster, matching web ------------------------- */
  bg:           '#FAF6F5', // Core Brand Background
  card:         '#FFFFFF',
  surfaceMuted: '#F4F1F0', // inset rows, muted wells
  border:       '#EAE6E5',
  borderStrong: '#D5CFCF',

  /* ---- Text ----------------------------------------------------------- */
  text:      '#091C44', // 16.5:1 on white
  textSub:   '#2E3E5C', // 10.7:1 on white
  textLight: '#6A7490', //  4.7:1 on white — was #999DAD (2.7:1, failed)

  /* ---- Status --------------------------------------------------------- *
   * Deliberately NOT the web's `success -> blue` / `warning -> navy` collapse,
   * which makes "Confirmed" and "Pending" the same hue. These are deepened and
   * desaturated so they sit inside the brand while staying hue-distinct.
   * Each pair is measured against its own tint. */
  success:   '#0E7C58', successBg: '#E3F4EC', // 4.6:1  (was #1FBE86)
  warning:   '#8A5200', warningBg: '#FBF0DF', // 5.6:1  (was #F5A623 on #FFF6E5 — 2.0:1, failed)
  error:     '#C0333A', errorBg:   '#FBEAEB', // 4.8:1
  errorOnDark: '#FF8A8F', // error text on navy surfaces (7.4:1 on navy); `error` is ~2.9:1 there
  info:      '#0B72BB', infoBg:    '#E6F5FF', // 4.6:1

  /* ---- Category accents ----------------------------------------------- *
   * Used to tell notification / pill categories apart. Deepened from the old
   * candy values so they read as part of the palette. */
  purple: '#5B3FBF', purpleBg: '#EEEAFB', // 6.2:1
  teal:   '#0A6E6A', tealBg:   '#E2F2F1', // 5.4:1

  /* ---- Deprecated ------------------------------------------------------ *
   * `blue3` is the old name for `blue100`. 68 call sites across 33 files, all
   * `backgroundColor`. Migrated in Phase 1, when every screen is already being
   * opened for the typography pass — one edit per file instead of two.
   * Do not use in new code. */
  blue3: '#E6F5FF',
} as const

export const radii = {
  sm: 10,
  default: 14,
  large: 20,
  card: 24,
  full: 9999,
} as const

export const shadows = {
  card: {
    shadowColor: '#091C44',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  raised: {
    shadowColor: '#091C44',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 6,
  },
} as const
