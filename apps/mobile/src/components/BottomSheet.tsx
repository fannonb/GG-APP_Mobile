import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Modal, PanResponder, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radii, shadows } from '@/theme'
import { prefersReducedMotion } from '@/lib/motion'
import Pressable from './Pressable'

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  /** Screen-reader label for the dimmed backdrop, e.g. "Close help and support". */
  closeLabel: string
  children: React.ReactNode
}

const DRAG_CLOSE_DISTANCE = 90

/**
 * A sheet that slides up while the background fades in, and can be dragged
 * down by its handle to close. With a plain `Modal animationType="slide"` the
 * dim backdrop slid up with the sheet and the handle did nothing.
 */
export default function BottomSheet({ visible, onClose, closeLabel, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets()
  const [mounted, setMounted] = useState(visible)
  const [height, setHeight] = useState(600)
  const progress = useRef(new Animated.Value(0)).current
  const drag = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const duration = prefersReducedMotion() ? 0 : visible ? 260 : 200
    if (visible) {
      setMounted(true)
      drag.setValue(0)
      Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setMounted(false))
    }
    // `mounted` only gates the exit animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > DRAG_CLOSE_DISTANCE || g.vy > 0.9) {
            onClose()
          } else {
            Animated.spring(drag, { toValue: 0, friction: 8, useNativeDriver: true }).start()
          }
        },
      }),
    [drag, onClose],
  )

  if (!mounted) return null

  const translateY = Animated.add(
    progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }),
    drag,
  )

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            feedback="none"
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
          />
        </Animated.View>
        <Animated.View
          onLayout={e => setHeight(e.nativeEvent.layout.height)}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16), transform: [{ translateY }] }]}
        >
          {/* The handle strip is the drag target, so inner scroll views keep their own gestures. */}
          <View {...pan.panHandlers} style={styles.handleArea} accessibilityHint="Drag down to close">
            <View style={styles.handle} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(13, 30, 66, 0.45)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.large,
    borderTopRightRadius: radii.large,
    paddingHorizontal: 20,
    ...shadows.raised,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 16,
    marginHorizontal: -20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
})
