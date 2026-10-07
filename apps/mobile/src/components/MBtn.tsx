import React from 'react'
import { Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native'
import Pressable from '@/components/Pressable'
import { colors, fontWeights, radii } from '@/theme'
import { hapticLight } from '@/lib/haptics'

type Variant =
  | 'primary'
  | 'action'
  | 'success'
  | 'warning'
  | 'danger'
  | 'dangerOutline'
  | 'outline'
  | 'ghost'
  | 'secondary'
  | 'dark'

interface MBtnProps {
  variant?: Variant
  sm?: boolean
  fullWidth?: boolean
  disabled?: boolean
  haptic?: boolean
  onPress?: () => void
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}

const variantStyles: Record<Variant, { container: ViewStyle; text: TextStyle }> = {
  // Primary CTAs are Deep Navy per the design guide.
  primary: {
    container: { backgroundColor: colors.navy },
    text: { color: '#FFFFFF' },
  },
  // Accent fill: ONLY on navy surfaces (dark cards, auth screens). On light
  // screens the primary action is always `primary` (navy). Navy text, because
  // white on the accent is only 2.3:1 (see the contrast rule in tokens.ts).
  action: {
    container: { backgroundColor: colors.blue },
    text: { color: colors.navy900 },
  },
  success: {
    container: { backgroundColor: colors.success },
    text: { color: '#FFFFFF' },
  },
  warning: {
    container: { backgroundColor: colors.warning },
    text: { color: '#FFFFFF' },
  },
  danger: {
    container: { backgroundColor: colors.error },
    text: { color: '#FFFFFF' },
  },
  // Destructive but not final, e.g. "Reject Invoice" that opens a confirmation.
  dangerOutline: {
    container: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.error },
    text: { color: colors.error },
  },
  outline: {
    container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.navy },
    text: { color: colors.navy },
  },
  ghost: {
    container: {
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.24)',
    },
    text: { color: '#FFFFFF' },
  },
  secondary: {
    container: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
    text: { color: colors.navy },
  },
  dark: {
    container: { backgroundColor: colors.navy },
    text: { color: '#FFFFFF' },
  },
}

export default function MBtn({
  variant = 'primary',
  sm,
  fullWidth,
  disabled,
  haptic = true,
  onPress,
  children,
  style,
}: MBtnProps) {
  const scheme = variantStyles[variant]

  const handlePress = () => {
    if (disabled) return
    if (haptic) {
      hapticLight()
    }
    onPress?.()
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.base,
        scheme.container,
        sm ? styles.sm : styles.md,
        fullWidth && styles.fullWidth,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.textBase, scheme.text, sm ? styles.textSm : styles.textMd]}>
        {children}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sm: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: radii.default,
  },
  md: {
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: radii.large,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.975 }],
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  textBase: {
    fontFamily: fontWeights.bold,
  },
  textSm: {
    fontSize: 13,
  },
  textMd: {
    fontSize: 15,
  },
})
