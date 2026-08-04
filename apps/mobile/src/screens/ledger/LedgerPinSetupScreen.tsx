import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useLedgerStatus, useSetupLedgerPinMutation } from '@gg/shared-hooks'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn, Field } from '@/components'

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
  const isReset = statusQuery.data?.hasPin ?? false

  const [form, setForm] = useState({ currentPin: '', pin: '', confirmPin: '' })
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const title = isReset ? 'Change Ledger PIN' : 'Create Ledger PIN'
  const subtitle = isReset
    ? 'Changing your PIN revokes access for every provider'
    : 'This PIN lets you consent to providers viewing your treatment history'

  const setField = <K extends keyof typeof form>(key: K, value: string) =>
    setForm(current => ({ ...current, [key]: value }))

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (isReset && form.currentPin.length < 4) {
      nextErrors.currentPin = 'Enter your current ledger PIN'
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

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      await setupPinMutation.mutateAsync({
        currentPin: isReset ? form.currentPin : undefined,
        pin: form.pin,
        confirmPin: form.confirmPin,
        expiresInDays,
      })
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
            {isReset ? (
              <Field
                label="Current PIN"
                value={form.currentPin}
                onChangeText={val => setField('currentPin', val.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter current PIN"
                secureTextEntry
                keyboardType="number-pad"
                required
                error={errors.currentPin}
              />
            ) : null}

            <Field
              label={isReset ? 'New Ledger PIN' : 'Ledger PIN'}
              value={form.pin}
              onChangeText={val => setField('pin', val.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 4–6 digit PIN"
              secureTextEntry
              keyboardType="number-pad"
              required
              error={errors.pin}
            />

            <Field
              label="Confirm PIN"
              value={form.confirmPin}
              onChangeText={val => setField('confirmPin', val.replace(/\D/g, '').slice(0, 6))}
              placeholder="Re-enter PIN"
              secureTextEntry
              keyboardType="number-pad"
              required
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
                disabled={setupPinMutation.isPending || statusQuery.isLoading}
                onPress={handleSubmit}
              >
                {setupPinMutation.isPending
                  ? 'Saving PIN...'
                  : isReset
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
