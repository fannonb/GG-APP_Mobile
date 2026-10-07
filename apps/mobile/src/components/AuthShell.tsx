import React from 'react'
import { View, Text, Image, ScrollView, StyleSheet, Dimensions } from 'react-native'
import Pressable from '@/components/Pressable'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { colors, fontWeights, radii } from '@/theme'
import Screen from './Screen'

const logo = require('../../assets/gg-logo.png')
const { width: SCREEN_WIDTH } = Dimensions.get('window')

/**
 * The navy sign-in look shared by every pre-login screen (forgot/reset
 * password, verify email), so they match Login and Register instead of
 * switching to the light in-app style halfway through signing in.
 */
export function AuthShell({
  title,
  highlight,
  subtitle,
  onBack,
  children,
}: {
  title: string
  /** Second line of the headline, in the accent colour. */
  highlight?: string
  subtitle?: string
  onBack?: () => void
  children: React.ReactNode
}) {
  const insets = useSafeAreaInsets()
  return (
    <Screen bg={colors.navy}>
      <View style={styles.bgGlow} pointerEvents="none" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 32,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={12}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M15 18l-6-6 6-6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          ) : (
            <View style={styles.spacer} />
          )}
          <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="GG'APP" />
          {/* Mirrors the back button's width so the logo stays centred. */}
          <View style={styles.spacer} />
        </View>

        <Text style={styles.title} accessibilityRole="header">
          {title}
          {highlight ? (
            <>
              {'\n'}
              <Text style={styles.highlight}>{highlight}</Text>
            </>
          ) : null}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        <View style={styles.body}>{children}</View>
      </ScrollView>
    </Screen>
  )
}

/** Accent-filled primary action. Accent is correct here: it sits on navy. */
export function AuthButton({
  children,
  onPress,
  disabled,
  busy,
}: {
  children: React.ReactNode
  onPress: () => void
  disabled?: boolean
  busy?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, disabled && styles.buttonDisabled]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
    >
      <Text style={styles.buttonText}>{children}</Text>
    </Pressable>
  )
}

export function AuthLink({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={styles.linkRow} accessibilityRole="link">
      <Text style={styles.linkText}>{children}</Text>
    </Pressable>
  )
}

export function AuthNotice({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  const isError = tone === 'error'
  return (
    <View
      style={[styles.notice, isError ? styles.noticeError : styles.noticeSuccess]}
      accessibilityLiveRegion="polite"
    >
      <Text style={[styles.noticeText, { color: isError ? colors.errorOnDark : '#7CE0B5' }]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  bgGlow: {
    position: 'absolute',
    bottom: '-20%',
    right: '-25%',
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_WIDTH * 1.5,
    borderRadius: 9999,
    backgroundColor: 'rgba(56, 182, 255, 0.04)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  spacer: {
    width: 40,
    height: 40,
  },
  logo: {
    width: 72,
    height: 72,
  },
  title: {
    fontFamily: fontWeights.extraBold,
    fontSize: 32,
    lineHeight: 39,
    letterSpacing: -0.8,
    color: '#FFFFFF',
  },
  highlight: {
    color: colors.blue,
  },
  subtitle: {
    fontFamily: fontWeights.regular,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 12,
  },
  body: {
    marginTop: 28,
    gap: 4,
  },
  button: {
    backgroundColor: colors.blue,
    paddingVertical: 16,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: fontWeights.bold,
    fontSize: 16,
    color: colors.navy900,
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  linkText: {
    fontFamily: fontWeights.bold,
    fontSize: 15,
    color: colors.blue,
  },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  noticeError: {
    backgroundColor: 'rgba(255, 138, 143, 0.12)',
    borderColor: 'rgba(255, 138, 143, 0.35)',
  },
  noticeSuccess: {
    backgroundColor: 'rgba(74, 222, 155, 0.12)',
    borderColor: 'rgba(74, 222, 155, 0.35)',
  },
  noticeText: {
    fontFamily: fontWeights.medium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
})
