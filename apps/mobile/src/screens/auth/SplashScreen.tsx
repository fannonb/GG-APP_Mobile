import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
  PanResponder,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { colors, fontWeights, radii } from '@/theme'
import type { AuthScreenProps } from '@/navigation/types'
import { markIntroSeen } from '@/lib/intro'
import BrandTagline from '@/components/BrandTagline'

const logo = require('../../../assets/gg-logo.png')
const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface SplashStep {
  id: string
  title: string
  highlight: string
  subtitle: string
}

const STEPS: SplashStep[] = [
  {
    id: 'access',
    title: 'Care When You Need It.\n',
    highlight: 'Choice Where You Want It.',
    subtitle: 'Access Healthcare on Your Terms - Choose the Care. We Help Fund It.',
  },
  {
    id: 'healing',
    title: 'Focus on healing,\n',
    highlight: 'not the billing.',
    subtitle: 'Experience stress-free care with instant allocation payments to verified providers.',
  },
]

export function SplashScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<AuthScreenProps<'Splash'>['navigation']>()

  const [activeStep, setActiveStep] = useState(0)
  // The swipe handler is created once, so it reads the step from a ref.
  const activeStepRef = useRef(0)
  const hasNavigated = useRef(false)

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.9)).current
  const logoOpacity = useRef(new Animated.Value(0)).current

  const current = STEPS[activeStep]

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      void Haptics.impactAsync(style)
    } catch {
      // safe fallback
    }
  }

  const leaveIntro = (destination: 'Login' | 'Register') => {
    if (hasNavigated.current) return
    hasNavigated.current = true
    markIntroSeen()
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium)
    navigation.replace('Login')
    // Login stays underneath Register so back from registration lands on sign-in.
    if (destination === 'Register') navigation.navigate('Register')
  }

  const animateTo = (index: number) => {
    if (index === activeStepRef.current) return
    triggerHaptic()

    const dir = index > activeStepRef.current ? -1 : 1
    activeStepRef.current = index
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: dir * 20,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveStep(index)
      
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start()
    })
  }

  const handleNext = () => {
    if (activeStep < STEPS.length - 1) {
      animateTo(activeStep + 1)
    } else {
      leaveIntro('Register')
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, state) => Math.abs(state.dx) > 30,
      onPanResponderRelease: (_, state) => {
        const current = activeStepRef.current
        if (state.dx < -40 && current < STEPS.length - 1) {
          animateTo(current + 1)
        } else if (state.dx > 40 && current > 0) {
          animateTo(current - 1)
        }
      },
    }),
  ).current

  useEffect(() => {
    // Initial mount animations
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          delay: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }, [])

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Abstract Background Elements (Minimal) */}
      <View style={styles.bgGlow} />

      {/* Top section: Logo, carefully placed and breathing */}
      <Animated.View
        style={[
          styles.logoSection,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="GG'APP" />
      </Animated.View>

      {/* Middle section: Typography focused, centred on the screen */}
      <View style={styles.textSection}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
        >
          <Text style={styles.title}>
            {current.title}
            <Text style={styles.highlight}>{current.highlight}</Text>
          </Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
        </Animated.View>
      </View>

      {/* Bottom section: Unified controls */}
      <View style={styles.controlSection}>
        {/* Step Indicators, with the brand promise beside them */}
        <View style={styles.indicatorRow}>
          <View style={styles.indicators}>
            {STEPS.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => animateTo(i)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={`Slide ${i + 1} of ${STEPS.length}`}
                accessibilityState={{ selected: i === activeStep }}
              >
                <View style={[styles.dot, i === activeStep && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>
          <BrandTagline style={styles.tagline} />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => leaveIntro('Login')}
            style={styles.skipBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>
              {activeStep === STEPS.length - 1 ? 'I have an account' : 'Skip'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            style={styles.nextBtn}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.nextText}>
              {activeStep === STEPS.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  bgGlow: {
    position: 'absolute',
    bottom: '-20%',
    right: '-20%',
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_WIDTH * 1.5,
    borderRadius: 9999,
    backgroundColor: 'rgba(56, 182, 255, 0.04)',
  },
  logoSection: {
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 140,
    opacity: 1,
  },
  textSection: {
    flex: 2,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontWeights.extraBold,
    fontSize: 34,
    color: '#FFFFFF',
    lineHeight: 42,
    letterSpacing: -0.8,
    marginBottom: 16,
    textAlign: 'center',
  },
  highlight: {
    color: colors.blue,
  },
  subtitle: {
    fontFamily: fontWeights.regular,
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 26,
    maxWidth: '90%',
    alignSelf: 'center',
    textAlign: 'center',
  },
  controlSection: {
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  indicators: {
    flexDirection: 'row',
    gap: 8,
  },
  tagline: {
    flex: 1,
    marginLeft: 16,
    fontSize: 11.5,
    lineHeight: 15,
    textAlign: 'left',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.blue,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: {
    paddingVertical: 12,
    paddingRight: 24,
  },
  skipText: {
    fontFamily: fontWeights.medium,
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  nextBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: radii.full,
  },
  nextText: {
    fontFamily: fontWeights.bold,
    fontSize: 17,
    color: colors.navy900,
  },
})


