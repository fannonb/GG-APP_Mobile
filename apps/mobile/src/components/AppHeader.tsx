import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import Pressable from '@/components/Pressable'
import { colors } from '@/theme'
import BrandLogo from './BrandLogo'
import MarketFlag from './MarketFlag'
import NotificationBell from './NotificationBell'

/**
 * tabRoot  Logo on the left; market flag and notifications bell on the right.
 * detail   Back button on the left, centred logo, screen actions on the right.
 * modal    Task screens that slide up from the bottom: close (x) on the left.
 * auth     Centred large logo; back only when the screen passes `onBack`.
 */
export type HeaderVariant = 'tabRoot' | 'detail' | 'modal' | 'auth'

/** The bar's own height, below the status-bar inset. */
export const APP_BAR_HEIGHT = 56

interface AppHeaderProps {
  variant: HeaderVariant
  /** Replaces the default navigation.goBack for back and close. */
  onBack?: () => void
  /** Screen-specific action, placed after the market flag. */
  right?: React.ReactNode
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

/**
 * The one app bar for every screen. It paints the status-bar inset in the same
 * navy, so the screen needs no separate status strip. Fixed above the content.
 */
export default function AppHeader({ variant, onBack, right }: AppHeaderProps) {
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
        <BrandLogo size="sm" />
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
        <View style={styles.side}>{left}</View>
        {centredSize ? (
          <View pointerEvents="none" style={styles.centre}>
            <BrandLogo size={centredSize} />
          </View>
        ) : null}
        <View style={[styles.side, styles.sideRight]}>
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
  logoInset: {
    paddingLeft: 8,
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
