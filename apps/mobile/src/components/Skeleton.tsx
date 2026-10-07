import React, { createContext, useContext, useEffect, useRef } from 'react'
import { Animated, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native'
import { colors, radii } from '@/theme'
import { prefersReducedMotion } from '@/lib/motion'

/**
 * Content-shaped placeholders shown while a screen loads, instead of a blank
 * screen with a spinner. One shared pulse drives every block on screen so they
 * breathe together; with "Reduce motion" on, they stay still.
 */
const PulseContext = createContext<Animated.Value | null>(null)

export function SkeletonGroup({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const pulse = useRef(new Animated.Value(0.55)).current
  useEffect(() => {
    if (prefersReducedMotion()) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])
  return (
    <PulseContext.Provider value={pulse}>
      <View
        style={style}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Loading"
      >
        {children}
      </View>
    </PulseContext.Provider>
  )
}

export function SkeletonBlock({
  width = '100%',
  height = 14,
  radius = radii.sm,
  style,
}: {
  width?: DimensionValue
  height?: number
  radius?: number
  style?: StyleProp<ViewStyle>
}) {
  const pulse = useContext(PulseContext)
  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius: radius, opacity: pulse ?? 0.7 },
        style,
      ]}
    />
  )
}

/** A white card with an icon chip and two lines, like a list row or alert. */
export function SkeletonRow() {
  return (
    <View style={styles.row}>
      <SkeletonBlock width={40} height={40} radius={radii.sm} />
      <View style={styles.rowText}>
        <SkeletonBlock width="70%" height={14} />
        <SkeletonBlock width="45%" height={12} />
      </View>
      <SkeletonBlock width={56} height={22} radius={radii.full} />
    </View>
  )
}

/** A list of rows inside one card. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.card}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={i < rows - 1 ? styles.divider : undefined}>
          <SkeletonRow />
        </View>
      ))}
    </View>
  )
}

/**
 * A balance card placeholder. Dark for the wallet's navy card; `light` for the
 * home credit card, whose face is pale blue with a partner logo chip.
 */
export function SkeletonBalanceCard({ light }: { light?: boolean } = {}) {
  const block = light ? styles.onLight : styles.onDark
  return (
    <View style={[styles.balance, light && styles.balanceLight]}>
      {light ? <SkeletonBlock width={84} height={44} radius={12} style={[block, { marginBottom: 16 }]} /> : null}
      <SkeletonBlock width="35%" height={12} style={block} />
      <SkeletonBlock width="60%" height={30} style={[block, { marginTop: 10 }]} />
      <SkeletonBlock width="100%" height={light ? 10 : 6} radius={5} style={[block, { marginTop: 16 }]} />
      <View style={styles.balanceActions}>
        <SkeletonBlock width={140} height={light ? 44 : 38} radius={radii.full} style={block} />
        <SkeletonBlock width={90} height={light ? 44 : 38} radius={radii.full} style={block} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.border,
  },
  onDark: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  onLight: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  rowText: {
    flex: 1,
    gap: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.large,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  balance: {
    backgroundColor: colors.navy600,
    borderRadius: radii.large,
    padding: 18,
  },
  balanceLight: {
    backgroundColor: '#DDF1FF',
    borderWidth: 1,
    borderColor: 'rgba(56,182,255,0.28)',
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
})
