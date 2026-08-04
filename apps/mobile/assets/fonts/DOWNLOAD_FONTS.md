# Fonts

Nothing needs to be downloaded or placed in this folder.

The app uses **Figtree**, the GG'APP brand typeface — the same family the PWA
(`gg-app`) uses in its design system. It ships as an npm package and is loaded
at runtime by `useFonts` in `App.tsx`:

```
@expo-google-fonts/figtree
```

Weights in use, mapped in `src/theme/typography.ts`:

| Token       | Family                 |
|-------------|------------------------|
| `regular`   | `Figtree_400Regular`   |
| `medium`    | `Figtree_500Medium`    |
| `semiBold`  | `Figtree_600SemiBold`  |
| `bold`      | `Figtree_700Bold`      |
| `extraBold` | `Figtree_800ExtraBold` |

To add a weight, import it in `App.tsx`'s `useFonts` call **and** add it to
`fontWeights` — a family string that was never loaded silently falls back to the
system font, which is easy to miss on Android.

> Superseded: the app previously used Plus Jakarta Sans. That was part of the
> brand drift from the PWA and was corrected in Phase 0 of `MOBILE_REDESIGN_PLAN.md`.
