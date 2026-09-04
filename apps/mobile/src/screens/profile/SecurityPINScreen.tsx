import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Svg, { Path } from 'react-native-svg'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn, GGPill, Field } from '@/components'
import { useSetupPaymentPinMutation, useChangePatientPasswordMutation } from '@gg/shared-hooks'
import { useUserStore, useAuthStore } from '@gg/shared-stores'

/* ------------------------------------------------------------------ */
/*  Shield icon (inline — not in shared icons)                         */
/* ------------------------------------------------------------------ */
function ShieldIcon({ size = 24, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/* ------------------------------------------------------------------ */
/*  PIN Input Section                                                  */
/* ------------------------------------------------------------------ */
interface PinSectionProps {
  label: string
  pin: string
  onPinChange: (val: string) => void
  helper: string
}

function PinSection({ label, pin, onPinChange, helper }: PinSectionProps) {
  const isSet = pin.length === 4

  return (
    <MCard padding={16}>
      <View style={styles.pinHeaderRow}>
        <Text style={styles.pinLabel}>{label}</Text>
        <GGPill type={isSet ? 'success' : 'warning'}>
          {isSet ? 'Set' : 'Not Set'}
        </GGPill>
      </View>

      <View style={styles.pinFieldWrap}>
        <Text style={styles.pinFieldLabel}>{helper}</Text>
        <TextInput
          style={styles.pinInput}
          value={pin}
          onChangeText={(val) => onPinChange(val.replace(/\D/g, '').slice(0, 4))}
          placeholder="----"
          placeholderTextColor={colors.textLight}
          secureTextEntry
          keyboardType="numeric"
          maxLength={4}
        />
      </View>
    </MCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */
export function SecurityPINScreen() {
  const navigation = useNavigation<any>()
  const setupPinMutation = useSetupPaymentPinMutation()
  const changePasswordMutation = useChangePatientPasswordMutation()
  const hasPaymentPin = useUserStore(s => s.user?.hasPaymentPin)

  const [currentPin, setCurrentPin] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

  const loading = setupPinMutation.isPending

  const validate = (): boolean => {
    if (hasPaymentPin && currentPin.length !== 4) {
      setError('Enter your current 4-digit PIN to update it.')
      return false
    }
    if (pin.length !== 4 || confirmPin.length !== 4) {
      setError('Your payment PIN must be exactly 4 digits.')
      return false
    }
    if (pin !== confirmPin) {
      setError('PIN confirmation does not match.')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    setError(null)
    setSuccess(false)
    if (!validate()) return

    try {
      await setupPinMutation.mutateAsync({
        pin,
        confirmPin,
        currentPin: hasPaymentPin ? currentPin : undefined,
      })
      useAuthStore.getState().completeOnboardingStep(3)
      setSuccess(true)
      setTimeout(() => {
        // Always land back on the Profile home, whatever route led here.
        navigation.popToTop()
      }, 1200)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to save your payment PIN. Please try again.'
      setError(message)
    }
  }

  const handleChangePassword = async () => {
    setPasswordError(null)
    setPasswordSuccess(null)
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('All password fields are required.')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }
    try {
      const result = await changePasswordMutation.mutateAsync(passwordForm)
      setPasswordSuccess(result.message)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: unknown) {
      setPasswordError(
        err instanceof Error ? err.message : 'Failed to update password. Please try again.',
      )
    }
  }

  return (
    <Screen bg={colors.bg}>
      <AppBar
        title="Security"
        subtitle={hasPaymentPin ? 'Payment PIN and account password' : 'Payment PIN and account password'}
        dark
        back={() => navigation.goBack()}
      />

      <ScrollArea gap={14} py={16} px={16}>
        {/* Info card */}
        <MCard padding={20}>
          <View style={styles.infoRow}>
            <View style={styles.shieldCircle}>
              <ShieldIcon size={22} color={colors.blue} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>
                {hasPaymentPin ? 'Update Your Payment PIN' : 'Set Your Payment PIN'}
              </Text>
              <Text style={styles.infoDesc}>
                Use one secure 4-digit PIN for payment authorization. You will
                confirm the same PIN during the three-step payment flow.
              </Text>
            </View>
          </View>
        </MCard>

        {hasPaymentPin ? (
          <PinSection
            label="Current PIN"
            pin={currentPin}
            onPinChange={setCurrentPin}
            helper="Enter your existing 4-digit PIN"
          />
        ) : null}

        <PinSection
          label="New PIN"
          pin={pin}
          onPinChange={setPin}
          helper="Enter your new 4-digit payment PIN"
        />

        <PinSection
          label="Confirm PIN"
          pin={confirmPin}
          onPinChange={setConfirmPin}
          helper="Re-enter the same 4-digit PIN"
        />

        {/* Error message */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Success message */}
        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              Payment PIN saved successfully. Redirecting...
            </Text>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          <MBtn
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.buttonHalf}
          >
            Cancel
          </MBtn>
          <MBtn
            variant="primary"
            fullWidth
            onPress={handleSubmit}
            disabled={loading}
            style={styles.buttonFlex}
          >
            {loading
              ? hasPaymentPin
                ? 'Updating PIN...'
                : 'Creating PIN...'
              : hasPaymentPin
                ? 'Update PIN'
                : 'Create PIN'}
          </MBtn>
        </View>

        <MCard padding={18}>
          <Text style={styles.infoTitle}>Change Password</Text>
          <Text style={[styles.infoDesc, { marginBottom: 12 }]}>
            Update the password you use to sign in to GG'APP.
          </Text>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          {passwordSuccess ? <Text style={styles.successInline}>{passwordSuccess}</Text> : null}
          <Field
            label="Current Password"
            placeholder="Enter current password"
            value={passwordForm.currentPassword}
            onChangeText={(v: string) => setPasswordForm(p => ({ ...p, currentPassword: v }))}
            secureTextEntry
            required
          />
          <Field
            label="New Password"
            placeholder="Minimum 8 characters"
            value={passwordForm.newPassword}
            onChangeText={(v: string) => setPasswordForm(p => ({ ...p, newPassword: v }))}
            secureTextEntry
            required
          />
          <Field
            label="Confirm New Password"
            placeholder="Repeat new password"
            value={passwordForm.confirmPassword}
            onChangeText={(v: string) => setPasswordForm(p => ({ ...p, confirmPassword: v }))}
            secureTextEntry
            required
          />
          <MBtn
            variant="primary"
            onPress={() => void handleChangePassword()}
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
          </MBtn>
        </MCard>

        {/* Bottom spacer */}
        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  /* Info card */
  infoRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  shieldCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.blue3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 18,
  },

  /* PIN section */
  pinHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pinLabel: {
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  pinFieldWrap: {
    marginBottom: 10,
  },
  pinFieldLabel: {
    fontSize: 11,
    fontFamily: fontWeights.semiBold,
    color: colors.textSub,
    marginBottom: 5,
  },
  pinInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.default,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontFamily: fontWeights.medium,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 8,
  },
  /* Messages */
  errorText: {
    fontSize: 13,
    fontFamily: fontWeights.medium,
    color: colors.error,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: colors.successBg,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  successText: {
    fontSize: 13,
    fontFamily: fontWeights.semiBold,
    color: colors.success,
    textAlign: 'center',
  },
  successInline: {
    fontSize: 13,
    fontFamily: fontWeights.semiBold,
    color: colors.success,
    marginBottom: 10,
  },

  /* Buttons */
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonHalf: {
    flex: 0,
    paddingHorizontal: 24,
  },
  buttonFlex: {
    flex: 1,
  },
})
