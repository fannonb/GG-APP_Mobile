import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Pressable from '@/components/Pressable'
import { useNavigation } from '@react-navigation/native'
import { useLedgerStatus, useSetupLedgerPinMutation, useResetLedgerPinMutation } from '@gg/shared-hooks'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn, Field, PinField } from '@/components'

const EXPIRY_OPTIONS: Array<{ value: number | undefined; label: string }> = [
  { value: undefined, label: 'No expiry' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '180 days' },
  { value: 365, label: '1 year' },
]

export function LedgerPinSetupScreen() {
  const navigation = useNavigation<any>()
  const statusQuery = useLedgerStatus()
  const setupPinMutation = useSetupLedgerPinMutation()
  const resetPinMutation = useResetLedgerPinMutation()
  const isReset = statusQuery.data?.hasPin ?? false

  const [form, setForm] = useState({ currentPin: '', password: '', pin: '', confirmPin: '' })
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [forgotMode, setForgotMode] = useState(false)

  const title = isReset ? 'Change Ledger PIN' : 'Create Ledger PIN'
  const subtitle = isReset
    ? 'Revokes all current provider access'
    : 'You decide who sees your records'

  const setField = <K extends keyof typeof form>(key: K, value: string) =>
    setForm(current => ({ ...current, [key]: value }))

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (isReset && !forgotMode && form.currentPin.length < 4) {
      nextErrors.currentPin = 'Enter your current ledger PIN'
    }
    if (forgotMode && !form.password.trim()) {
      nextErrors.password = 'Confirm your account password to reset the ledger PIN'
    }
    if (!/^\d{4,6}$/.test(form.pin)) {
      nextErrors.pin = 'PIN must be 4 to 6 digits'
    }
    if (form.confirmPin !== form.pin) {
      nextErrors.confirmPin = 'PIN confirmation does not match'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const saving = setupPinMutation.isPending || resetPinMutation.isPending

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      if (forgotMode) {
        await resetPinMutation.mutateAsync({
          password: form.password,
          pin: form.pin,
          confirmPin: form.confirmPin,
          expiresInDays,
        })
      } else {
        await setupPinMutation.mutateAsync({
          currentPin: isReset ? form.currentPin : undefined,
          pin: form.pin,
          confirmPin: form.confirmPin,
          expiresInDays,
        })
      }
      navigation.navigate('HealthLedger')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save your ledger PIN.'
      setErrors(current => ({ ...current, submit: message }))
    }
  }

  return (
    <Screen>
      <AppBar title={title} subtitle={subtitle} back />
      <ScrollArea gap={16} px={16} py={14}>
        <MCard padding={20}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>You are in control: </Text>
              only share this PIN with providers you want to view your treatment and diagnosis
              history. Access lasts 24 hours per unlock and is always logged.
            </Text>
          </View>

          <View style={styles.form}>
            {isReset && !forgotMode ? (
              <View>
                <PinField
                  label="Current PIN"
                  value={form.currentPin}
                  onChange={val => setField('currentPin', val)}
                  length={6}
                  error={errors.currentPin}
                />
                <Pressable
                  onPress={() => {
                    setForgotMode(true)
                    setErrors({})
                    setField('currentPin', '')
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.forgotLink}>Forgot PIN?</Text>
                </Pressable>
              </View>
            ) : null}

            {forgotMode ? (
              <View>
                <View style={styles.resetBox}>
                  <Text style={styles.resetText}>
                    The old PIN cannot be recovered. Confirm your GG'APP account password, then
                    choose a new Ledger PIN. This revokes any current provider access.
                  </Text>
                </View>
                <Field
                  label="Account password"
                  value={form.password}
                  onChangeText={val => setField('password', val)}
                  placeholder="Enter your account password"
                  secureTextEntry
                  autoCapitalize="none"
                  required
                  error={errors.password}
                />
                <Pressable
                  onPress={() => {
                    setForgotMode(false)
                    setErrors({})
                    setField('password', '')
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.forgotLink}>I remember my PIN</Text>
                </Pressable>
              </View>
            ) : null}

            <PinField
              label={isReset ? 'New Ledger PIN' : 'Ledger PIN'}
              value={form.pin}
              onChange={val => setField('pin', val)}
              length={6}
              hint="4 to 6 digits"
              error={errors.pin}
            />

            <PinField
              label="Confirm PIN"
              value={form.confirmPin}
              onChange={val => setField('confirmPin', val)}
              length={6}
              error={errors.confirmPin}
            />

            <View>
              <Text style={styles.expiryLabel}>PIN expiry (optional)</Text>
              <View style={styles.chipRow}>
                {EXPIRY_OPTIONS.map(option => {
                  const active = expiresInDays === option.value
                  return (
                    <Pressable
                      key={option.label}
                      onPress={() => setExpiresInDays(option.value)}
                      style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active ? styles.chipTextActive : styles.chipTextInactive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
              <Text style={styles.hint}>
                After expiry, providers can no longer unlock with this PIN until you create a new
                one.
              </Text>
            </View>

            {errors.submit ? <Text style={styles.error}>{errors.submit}</Text> : null}

            <View style={styles.btnRow}>
              <MBtn
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => navigation.goBack()}
              >
                Cancel
              </MBtn>
              <MBtn
                variant="primary"
                style={{ flex: 1 }}
                disabled={saving || statusQuery.isLoading}
                onPress={handleSubmit}
              >
                {saving
                  ? 'Saving PIN...'
                  : forgotMode || isReset
                    ? 'Update PIN'
                    : 'Create PIN'}
              </MBtn>
            </View>
          </View>
        </MCard>
        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

export default LedgerPinSetupScreen

const styles = StyleSheet.create({
  infoBox: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.blue100,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(74,173,223,0.2)',
    marginBottom: 18,
  },
  infoText: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    color: '#1A5D8A',
    lineHeight: 20,
  },
  infoBold: {
    fontFamily: fontWeights.bold,
  },
  forgotLink: {
    fontFamily: fontWeights.bold,
    fontSize: 13,
    color: colors.blueInk,
    marginTop: 8,
  },
  resetBox: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  resetText: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    color: colors.textSub,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  expiryLabel: {
    fontFamily: fontWeights.semiBold,
    fontSize: 13,
    color: colors.navy,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    borderWidth: 1.5,
  },
  chipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipInactive: {
    backgroundColor: '#fff',
    borderColor: colors.border,
  },
  chipText: {
    fontFamily: fontWeights.bold,
    fontSize: 12.5,
  },
  chipTextActive: {
    color: '#fff',
  },
  chipTextInactive: {
    color: colors.textSub,
  },
  hint: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.textLight,
    marginTop: 8,
  },
  error: {
    fontFamily: fontWeights.semiBold,
    fontSize: 12,
    color: colors.error,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
})
