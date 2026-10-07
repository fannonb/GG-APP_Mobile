import React, { forwardRef } from 'react'
import { Pressable as RNPressable, StyleSheet, type PressableProps, type View } from 'react-native'

export type AppPressableProps = PressableProps & {
  /**
   * 'opacity' (default) dims the element while pressed. Use 'none' for
   * surfaces that shouldn't flash, such as a modal's dimmed backdrop.
   */
  feedback?: 'opacity' | 'none'
}

/**
 * The app's Pressable. Every tappable element gets visible feedback the moment
 * it is touched; before this, most cards, rows and links showed nothing until
 * the next screen appeared. Elements that pass their own `({ pressed }) => …`
 * style keep full control of their pressed look.
 */
const Pressable = forwardRef<View, AppPressableProps>(function Pressable(
  { style, feedback = 'opacity', disabled, ...rest },
  ref,
) {
  const interactive = Boolean(rest.onPress || rest.onLongPress)
  if (typeof style === 'function' || feedback === 'none' || !interactive) {
    return <RNPressable ref={ref} style={style} disabled={disabled} {...rest} />
  }
  return (
    <RNPressable
      ref={ref}
      disabled={disabled}
      style={({ pressed }) => [style, pressed && !disabled && styles.pressed]}
      {...rest}
    />
  )
})

export default Pressable

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.6,
  },
})
