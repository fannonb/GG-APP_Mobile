import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Pressable from '@/components/Pressable'
import { colors, fontWeights } from '@/theme'
import Svg, { Path } from 'react-native-svg'
import { hapticLight } from '@/lib/haptics'

interface KeyPadProps {
  onKeyPress: (key: string) => void
  onDelete: () => void
  onConfirm?: () => void
  /** False until the PIN is complete; the confirm key greys out. Defaults to true. */
  confirmEnabled?: boolean
}

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['backspace', '0', 'confirm'],
]

function BackspaceIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"
        stroke={colors.text}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 9.5l4 4M18 9.5l-4 4"
        stroke={colors.text}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function CheckmarkIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12l5 5 9-9"
        stroke="#FFFFFF"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export default function KeyPad({ onKeyPress, onDelete, onConfirm, confirmEnabled = true }: KeyPadProps) {
  const canConfirm = Boolean(onConfirm) && confirmEnabled
  const handleDigit = (key: string) => {
    hapticLight()
    onKeyPress(key)
  }

  const handleDelete = () => {
    hapticLight()
    onDelete()
  }

  const handleConfirm = () => {
    if (!onConfirm || !confirmEnabled) return
    hapticLight()
    onConfirm()
  }

  return (
    <View style={styles.container}>
      {ROWS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((key) => {
            if (key === 'backspace') {
              return (
                <Pressable
                  key={key}
                  onPress={handleDelete}
                  accessibilityRole="button"
                  accessibilityLabel="Delete last digit"
                  style={({ pressed }) => [
                    styles.key,
                    styles.keySpecial,
                    pressed && styles.keySpecialPressed,
                  ]}
                >
                  <BackspaceIcon />
                </Pressable>
              )
            }
            if (key === 'confirm') {
              return (
                <Pressable
                  key={key}
                  onPress={handleConfirm}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm PIN"
                  accessibilityState={{ disabled: !canConfirm }}
                  style={({ pressed }) => [
                    styles.key,
                    styles.keyConfirm,
                    !canConfirm && styles.keyConfirmDisabled,
                    pressed && canConfirm && styles.keyConfirmPressed,
                  ]}
                  disabled={!canConfirm}
                >
                  <CheckmarkIcon />
                </Pressable>
              )
            }
            return (
              <Pressable
                key={key}
                onPress={() => handleDigit(key)}
                accessibilityRole="keyboardkey"
                accessibilityLabel={key}
                style={({ pressed }) => [
                  styles.key,
                  styles.keyNumber,
                  pressed && styles.keyPressed,
                ]}
              >
                <Text style={styles.keyText}>{key}</Text>
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  key: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyNumber: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyPressed: {
    backgroundColor: '#EEF4FB',
    transform: [{ scale: 0.94 }],
    borderColor: colors.blue100,
  },
  keySpecial: {
    backgroundColor: colors.bg,
  },
  keySpecialPressed: {
    backgroundColor: '#E2E8F0',
    transform: [{ scale: 0.94 }],
  },
  keyConfirm: {
    backgroundColor: colors.success,
  },
  keyConfirmDisabled: {
    backgroundColor: colors.borderStrong,
  },
  keyConfirmPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.94 }],
  },
  keyText: {
    fontSize: 22,
    fontFamily: fontWeights.semiBold,
    color: colors.text,
  },
})
