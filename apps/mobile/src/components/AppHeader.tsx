import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import Pressable from '@/components/Pressable'
import { colors, fontWeights } from '@/theme'
import BrandLogo from './BrandLogo'
import MarketFlag from './MarketFlag'
import NotificationBell from './NotificationBell'

/**
 * tabRoot  Logo on the left; on the right, an optional greeting, the market flag and the notifications bell.
 * detail   Back button on the left, centred logo, screen actions on the right.
 * modal    Task screens that slide up from the bottom: close (x) on the left.
 * auth     Centred large logo; back only when the screen passes `onBack`.
 */
export type HeaderVariant = 'tabRoot' | 'detail' | 'modal' | 'auth'

/** The bar's own height, below the status-bar inset. */
export const APP_BAR_HEIGHT = 56

/** A small greeting in the right-hand group, just before the market flag. */
export interface HeaderGreeting {
  /** First line, white and semibold, e.g. "Good evening, Fannon". */
  line1: string
  /** Second line, softer and regular, e.g. "Sat, Nov 7". */
  line2?: string
  /** What a screen reader says. Defaults to the two visible lines. */
  accessibilityLabel?: string
}

interface AppHeaderProps {
  variant: HeaderVariant
  /** Replaces the default navigation.goBack for back and close. */
  onBack?: () => void
  /** Screen-specific action, placed after the market flag. */
  right?: React.ReactNode
  /** Greeting text on the right, before the market flag. Only the dashboard passes one. */
  greeting?: HeaderGreeting
}

function ChevronLeft() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function CloseX() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

function IconButton({
  label,
  onPress,
  children,
}: {
  label: string
  onPress: () => void
  children: React.ReactNode
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={styles.iconBtn}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {children}
    </Pressable>
  )
}

/** Two small right-aligned lines. They shrink and truncate rather than push the flag or the logo. */
function GreetingBlock({ line1, line2, accessibilityLabel }: HeaderGreeting) {
  return (
    <View
      style={styles.greeting}
      accessible
      accessibilityLabel={accessibilityLabel ?? [line1, line2].filter(Boolean).join('. ')}
    >
      <Text style={styles.greetingLine1} numberOfLines={1}>
        {line1}
      </Text>
      {line2 ? (
        <Text style={styles.greetingLine2} numberOfLines={1}>
          {line2}
        </Text>
      ) : null}
    </View>
  )
}

/**
 * The one app bar for every screen. It paints the status-bar inset in the same
 * navy, so the screen needs no separate status strip. Fixed above the content.
 */
export default function AppHeader({ variant, onBack, right, greeting }: AppHeaderProps) {
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const goBack = onBack ?? (() => navigation.goBack())
  const canGoBack = onBack != null || navigation.canGoBack()
  const signedIn = variant !== 'auth'

  let left: React.ReactNode = null
  if (variant === 'tabRoot') {
    // Inset so the wordmark lines up with the 16pt screen gutter.
    left = (
      <View style={styles.logoInset}>
        {/* With a greeting the wordmark drops from 24 to 20 pt, so the greeting keeps room on a 360 pt phone. */}
        <BrandLogo size="sm" style={greeting ? styles.logoBesideGreeting : undefined} />
      </View>
    )
  } else if (variant === 'modal') {
    left = (
      <IconButton label="Close" onPress={goBack}>
        <CloseX />
      </IconButton>
    )
  } else if (variant === 'detail' && canGoBack) {
    left = (
      <IconButton label="Back" onPress={goBack}>
        <ChevronLeft />
      </IconButton>
    )
  } else if (variant === 'auth' && onBack) {
    left = (
      <IconButton label="Back" onPress={goBack}>
        <ChevronLeft />
      </IconButton>
    )
  }

  const centredSize = variant === 'auth' ? 'lg' : variant === 'detail' || variant === 'modal' ? 'sm' : null

  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={[styles.side, greeting ? styles.sideFit : null]}>{left}</View>
        {centredSize ? (
          <View pointerEvents="none" style={styles.centre}>
            <BrandLogo size={centredSize} />
          </View>
        ) : null}
        <View style={[styles.side, styles.sideRight]}>
          {greeting ? <GreetingBlock {...greeting} /> : null}
          {signedIn ? <MarketFlag /> : null}
          {variant === 'tabRoot' ? <NotificationBell /> : null}
          {right}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.navy,
  },
  row: {
    height: APP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  // With a greeting, the logo side keeps only its own width and the right side takes the rest.
  sideFit: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
  },
  logoInset: {
    paddingLeft: 8,
  },
  // 20 pt tall, the same 4.7:1 wordmark ratio as BrandLogo's 24 pt default.
  logoBesideGreeting: {
    width: 94,
    height: 20,
  },
  // Shrinks first: the flag and bell keep their size, and the text ellipsizes on narrow phones.
  greeting: {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: 168,
  },
  greetingLine1: {
    fontFamily: fontWeights.semiBold,
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'right',
  },
  greetingLine2: {
    fontFamily: fontWeights.regular,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'right',
  },
  centre: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
