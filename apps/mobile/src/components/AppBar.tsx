import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { colors, fontWeights } from '@/theme'

interface AppBarProps {
  title: string
  subtitle?: string
  dark?: boolean
  back?: (() => void) | boolean
  right?: React.ReactNode
  variant?: 'hero' | 'inline'
}

function BackArrow({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export default function AppBar({
  title,
  subtitle,
  dark = true,
  back,
  right,
  variant = 'inline',
}: AppBarProps) {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  const bgColor = dark ? colors.navy : colors.card
  const titleColor = dark ? '#FFFFFF' : colors.text
  const subtitleColor = dark ? 'rgba(255, 255, 255, 0.7)' : colors.textSub
  const arrowColor = dark ? '#FFFFFF' : colors.text

  const shouldShowBack =
    typeof back === 'function'
      ? true
      : back === true
      ? true
      : back === false
      ? false
      : navigation.canGoBack()

  const handleBack = typeof back === 'function' ? back : () => navigation.goBack()

  const isHero = variant === 'hero'
  const paddingTop = insets.top + (isHero ? 14 : 10)
  const paddingBottom = isHero ? 20 : 14

  return (
    <View style={[styles.bar, { backgroundColor: bgColor, paddingTop, paddingBottom }]}>
      <View style={styles.left}>
        {shouldShowBack ? (
          <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={10}>
            <BackArrow color={arrowColor} />
          </Pressable>
        ) : null}
        <View style={styles.titles}>
          <Text style={[isHero ? styles.heroTitle : styles.title, { color: titleColor }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    marginRight: 12,
    padding: 2,
  },
  titles: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: fontWeights.bold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  title: {
    fontFamily: fontWeights.semiBold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    marginTop: 2,
  },
  right: {
    marginLeft: 12,
  },
})

