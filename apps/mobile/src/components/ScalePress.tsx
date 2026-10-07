import React, { useRef } from 'react'
import {
  Animated,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native'
import Pressable from '@/components/Pressable'
import { hapticLight } from '@/lib/haptics'

export interface ScalePressProps {
  children: React.ReactNode
  onPress?: (event: GestureResponderEvent) => void
  onLongPress?: (event: GestureResponderEvent) => void
  disabled?: boolean
  activeScale?: number
  activeOpacity?: number
  haptic?: boolean
  style?: StyleProp<ViewStyle>
  hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number }
  accessibilityLabel?: string
  accessibilityRole?: 'button' | 'link' | 'tab' | 'none'
}

export default function ScalePress({
  children,
  onPress,
  onLongPress,
  disabled = false,
  activeScale = 0.975,
  activeOpacity = 0.92,
  haptic = false,
  style,
  hitSlop,
  accessibilityLabel,
  accessibilityRole = 'button',
}: ScalePressProps) {
  const scale = useRef(new Animated.Value(1)).current
  const opacity = useRef(new Animated.Value(1)).current

  const handlePressIn = (e: GestureResponderEvent) => {
    if (disabled) return
    if (haptic) {
      hapticLight()
    }
    Animated.parallel([
      Animated.spring(scale, {
        toValue: activeScale,
        speed: 30,
        bounciness: 3,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: activeOpacity,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handlePressOut = (e: GestureResponderEvent) => {
    if (disabled) return
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        speed: 24,
        bounciness: 4,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start()
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={{ alignSelf: 'stretch' }}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  )
}
