import React, { useEffect, useRef } from 'react'
import { View, Text, Image, StyleSheet, Animated, Easing } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { colors, fontWeights } from '@/theme'
import type { AuthScreenProps } from '@/navigation/types'

const logo = require('../../../assets/gg-logo.png')

export function SplashScreen() {
  const navigation = useNavigation<AuthScreenProps<'Splash'>['navigation']>()
  const fade = useRef(new Animated.Value(0)).current
  const rise = useRef(new Animated.Value(14)).current
  const pulse = useRef(new Animated.Value(0.35)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start()

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
      ]),
    )
    pulseLoop.start()

    const timer = setTimeout(() => {
      navigation.replace('Login')
    }, 2800)

    return () => {
      clearTimeout(timer)
      pulseLoop.stop()
    }
  }, [fade, navigation, pulse, rise])

  return (
    <View style={styles.container}>
      <View style={[styles.ring, styles.ring1]} />
      <View style={[styles.ring, styles.ring2]} />
      <View style={[styles.ring, styles.ring3]} />

      <Animated.View
        style={[
          styles.center,
          {
            opacity: fade,
            transform: [{ translateY: rise }],
          },
        ]}
      >
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.brand}>Gateway Global Healthcare</Text>
        <Text style={styles.tagline}>A product of Gateway Global</Text>

        <View style={styles.dotsRow}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  opacity: pulse,
                  transform: [
                    {
                      scale: pulse.interpolate({
                        inputRange: [0.35, 1],
                        outputRange: [0.85, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>

      <Text style={styles.copyright}>© Gateway Global (Pvt) Ltd.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
  },
  ring1: {
    width: 200,
    height: 200,
    borderColor: 'rgba(47,155,255,0.14)',
  },
  ring2: {
    width: 340,
    height: 340,
    borderColor: 'rgba(47,155,255,0.09)',
  },
  ring3: {
    width: 480,
    height: 480,
    borderColor: 'rgba(47,155,255,0.05)',
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 24,
  },
  brand: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: fontWeights.medium,
    textAlign: 'center',
  },
  tagline: {
    marginTop: 8,
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.4,
    fontFamily: fontWeights.regular,
    textAlign: 'center',
    marginBottom: 28,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.blue,
  },
  copyright: {
    position: 'absolute',
    bottom: 36,
    fontSize: 11,
    color: 'rgba(255,255,255,0.18)',
    fontFamily: fontWeights.regular,
  },
})
