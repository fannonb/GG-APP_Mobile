import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, fontWeights } from '@/theme'
import MBtn from './MBtn'

interface EmptyIllustrationProps {
  icon: React.ReactNode
  title: string
  subtitle: string
  cta?: string
  ctaVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'outline' | 'ghost' | 'secondary' | 'dark'
  onCta?: () => void
}

export default function EmptyIllustration({
  icon,
  title,
  subtitle,
  cta,
  ctaVariant = 'primary',
  onCta,
}: EmptyIllustrationProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {cta && onCta && (
        <MBtn variant={ctaVariant} onPress={onCta}>
          {cta}
        </MBtn>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 28,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.blue3,
    borderWidth: 1.5,
    borderColor: 'rgba(47,155,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: fontWeights.extraBold,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 24,
    marginBottom: 28,
    maxWidth: 260,
    textAlign: 'center',
  },
})
