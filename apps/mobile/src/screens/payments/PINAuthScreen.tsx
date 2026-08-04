import React, { useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Vibration } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import Svg, { Path, Circle } from 'react-native-svg'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn, KeyPad } from '@/components'
import { CheckIcon, LockIcon } from '@/icons'
import { useAuthorizePaymentMutation, usePatientInvoice } from '@gg/shared-hooks'
import { useUserStore } from '@gg/shared-stores'
import { formatCurrency } from '@gg/shared-utils'
import type { InvoicesScreenProps, InvoicesStackParamList } from '@/navigation/types'
import type { PatientInvoice } from '@gg/shared-types'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

type PINAuthRoute = RouteProp<InvoicesStackParamList, 'PINAuth'>
type PINAuthNav = NativeStackNavigationProp<InvoicesStackParamList, 'PINAuth'>

const PIN_LENGTH = 4

const STEP_LABELS = ['Step 1', 'Step 2', 'Step 3'] as const

const STEP_TITLES: Record<number, { title: string; sub: string }> = {
  1: { title: 'First Confirmation', sub: 'Enter your payment PIN' },
  2: { title: 'Second Confirmation', sub: 'Enter the same payment PIN again' },
  3: { title: 'Final Confirmation', sub: 'Enter the same payment PIN one last time' },
}

/* ---------- Step Indicator ---------- */

function StepCircle({
  number,
  state,
}: {
  number: number
  state: 'completed' | 'active' | 'pending'
}) {
  const size = 32
  if (state === 'completed') {
    return (
      <View style={[stepStyles.circle, { backgroundColor: colors.success }]}>
        <CheckIcon size={16} color="#FFFFFF" />
      </View>
    )
  }
  if (state === 'active') {
    return (
      <View style={[stepStyles.circle, { backgroundColor: colors.blue }]}>
        <Text style={stepStyles.circleTextWhite}>{number}</Text>
      </View>
    )
  }
  return (
    <View style={[stepStyles.circle, { backgroundColor: colors.border }]}>
      <Text style={stepStyles.circleTextLight}>{number}</Text>
    </View>
  )
}

function StepLine({ completed }: { completed: boolean }) {
  return (
    <View
      style={[
        stepStyles.line,
        { backgroundColor: completed ? colors.success : colors.border },
      ]}
    />
  )
}

function StepIndicator({
  currentStep,
  completedSteps,
}: {
  currentStep: number
  completedSteps: number[]
}) {
  const getState = (step: number) => {
    if (completedSteps.includes(step)) return 'completed'
    if (step === currentStep) return 'active'
    return 'pending'
  }

  return (
    <View style={stepStyles.wrapper}>
      <View style={stepStyles.row}>
        <StepCircle number={1} state={getState(1)} />
        <StepLine completed={completedSteps.includes(1)} />
        <StepCircle number={2} state={getState(2)} />
        <StepLine completed={completedSteps.includes(2)} />
        <StepCircle number={3} state={getState(3)} />
      </View>
      <View style={stepStyles.labels}>
        {STEP_LABELS.map((label) => (
          <Text key={label} style={stepStyles.labelText}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  )
}

const stepStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    maxWidth: 280,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleTextWhite: {
    fontFamily: fontWeights.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  circleTextLight: {
    fontFamily: fontWeights.bold,
    fontSize: 13,
    color: colors.textLight,
  },
  line: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 8,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 6,
  },
  labelText: {
    fontFamily: fontWeights.medium,
    fontSize: 11,
    color: colors.textSub,
    textAlign: 'center',
    width: 48,
  },
})

/* ---------- PIN Dots ---------- */

function PINDots({ filled, hasError }: { filled: number; hasError: boolean }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            {
              backgroundColor:
                i < filled
                  ? hasError
                    ? colors.error
                    : colors.navy
                  : colors.border,
              transform: [{ scale: i < filled ? 1.1 : 1 }],
            },
          ]}
        />
      ))}
    </View>
  )
}

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 8,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
})

/* ---------- Main Screen ---------- */

export function PINAuthScreen() {
  const route = useRoute<PINAuthRoute>()
  const navigation = useNavigation<PINAuthNav>()
  const params = route.params
  const invoiceId = params?.invoiceId ?? ''

  // Deep links (app/invoices/:id/pay) only carry the invoice id, so
  // re-derive the payment breakdown from the invoice and the wallet when
  // the navigation params are incomplete.
  const paramsIncomplete = !params || params.amount == null
  const { data: invoiceData, isLoading: invoiceLoading } = usePatientInvoice(
    paramsIncomplete ? invoiceId : undefined,
  )
  const user = useUserStore((s) => s.user)
  const inv = invoiceData as PatientInvoice | undefined

  const amount = params?.amount ?? inv?.amount ?? 0
  const walletPayAmount =
    params?.walletPayAmount ?? Math.min(Math.max(0, user?.creditAvailable ?? 0), amount)
  const offAppDue =
    params?.offAppDue ?? Math.max(0, Number((amount - walletPayAmount).toFixed(2)))
  const provider =
    params?.provider ??
    (typeof inv?.provider === 'object' ? inv?.provider?.name : inv?.provider) ??
    'Service Provider'
  const isPartialPay = walletPayAmount > 0 && offAppDue > 0

  const authorizePayment = useAuthorizePaymentMutation()

  const [currentStep, setCurrentStep] = useState(1)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const stepInfo = STEP_TITLES[currentStep] ?? STEP_TITLES[1]

  const handleConfirm = async () => {
    if (pin.length !== PIN_LENGTH) return
    setError(null)
    try {
      const result = await authorizePayment.mutateAsync({
        invoiceId,
        pin,
        step: currentStep,
      })
      if (result.success) {
        if (result.complete) {
          navigation.replace('PaymentSuccess', {
            invoiceId,
            amount,
            walletAmountPaid: result.walletAmountPaid ?? walletPayAmount,
            offAppAmountDue: result.offAppAmountDue ?? offAppDue,
            provider,
          })
        } else {
          setCompletedSteps((prev) => [...prev, currentStep])
          setCurrentStep((prev) => prev + 1)
          setPin('')
        }
      } else {
        setError(result.message || 'Incorrect PIN')
        setPin('')
        Vibration.vibrate(200)
        if (result.attemptsRemaining === 0) {
          setIsLocked(true)
        }
      }
    } catch {
      setError('Authorization failed')
      setPin('')
    }
  }

  const handleKeyPress = (key: string) => {
    if (pin.length < PIN_LENGTH) {
      setPin((prev) => prev + key)
      Vibration.vibrate(10)
    }
  }

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1))
  }

  /* ------ Deep-link hydration ------ */
  if (paramsIncomplete && invoiceLoading) {
    return (
      <Screen bg={colors.bg}>
        <AppBar title="Payment Authorization" subtitle="Payment PIN security" />
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      </Screen>
    )
  }

  /* ------ Locked State ------ */
  if (isLocked) {
    return (
      <Screen bg={colors.bg}>
        <AppBar title="Payment Authorization" subtitle="Payment PIN security" />
        <ScrollArea gap={20}>
          <View style={s.lockedContainer}>
            <View style={s.lockedCircle}>
              <LockIcon size={38} color={colors.error} />
            </View>
            <Text style={s.lockedTitle}>Account Locked</Text>
            <Text style={s.lockedSubtitle}>
              Too many incorrect PIN attempts. Your payment session has been
              locked for security.
            </Text>
            <MBtn
              variant="secondary"
              fullWidth
              onPress={() => navigation.navigate('InvoiceList')}
            >
              Back to Invoices
            </MBtn>
          </View>
        </ScrollArea>
      </Screen>
    )
  }

  /* ------ Normal Flow ------ */
  return (
    <Screen bg={colors.bg}>
      <AppBar title="Payment Authorization" subtitle="Payment PIN security" />
      <ScrollArea gap={16} px={20}>
        {/* Step Indicator */}
        <StepIndicator
          currentStep={currentStep}
          completedSteps={completedSteps}
        />

        {/* Amount Display */}
        <MCard style={s.amountCard}>
          <Text style={s.amountLabel}>
            {isPartialPay ? 'AUTHORIZING IN-APP PORTION' : 'AUTHORIZING PAYMENT'}
          </Text>
          <Text style={s.amountValue}>
            {formatCurrency(walletPayAmount ?? amount ?? 0)}
          </Text>
          <Text style={s.amountProvider}>
            to {provider ?? 'Service Provider'}
          </Text>
          {isPartialPay && (
            <Text style={s.amountPartial}>
              Invoice {formatCurrency(amount ?? 0)} · Off-app remainder {formatCurrency(offAppDue ?? 0)}
            </Text>
          )}
        </MCard>

        {/* PIN Prompt */}
        <View style={s.promptSection}>
          <Text style={s.promptTitle}>{stepInfo.title}</Text>
          <Text style={s.promptSubtitle}>{stepInfo.sub}</Text>
        </View>

        {/* PIN Dots */}
        <PINDots filled={pin.length} hasError={!!error} />

        {/* Error Message */}
        {error ? <Text style={s.errorText}>{error}</Text> : null}

        {/* Loading Indicator */}
        {authorizePayment.isPending ? (
          <View style={s.loadingRow}>
            <ActivityIndicator size="small" color={colors.blue} />
            <Text style={s.loadingText}>Verifying...</Text>
          </View>
        ) : null}

        {/* NumPad */}
        <KeyPad
          onKeyPress={handleKeyPress}
          onDelete={handleDelete}
          onConfirm={handleConfirm}
        />
      </ScrollArea>
    </Screen>
  )
}

const s = StyleSheet.create({
  /* Amount card */
  amountCard: {
    backgroundColor: colors.bg,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amountLabel: {
    fontFamily: fontWeights.semiBold,
    fontSize: 11,
    color: colors.textSub,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  amountValue: {
    fontFamily: fontWeights.extraBold,
    fontSize: 32,
    color: colors.text,
    letterSpacing: -1,
  },
  amountProvider: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.textSub,
    marginTop: 2,
  },
  amountPartial: {
    fontFamily: fontWeights.semiBold,
    fontSize: 12,
    color: colors.warning,
    marginTop: 8,
    textAlign: 'center',
  },

  /* Prompt */
  promptSection: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  promptTitle: {
    fontFamily: fontWeights.bold,
    fontSize: 17,
    color: colors.text,
    marginBottom: 4,
  },
  promptSubtitle: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    color: colors.textSub,
  },

  /* Error */
  errorText: {
    fontFamily: fontWeights.semiBold,
    fontSize: 12,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 4,
  },

  /* Loading */
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  loadingText: {
    fontFamily: fontWeights.medium,
    fontSize: 13,
    color: colors.blue,
  },

  /* Locked */
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  lockedCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  lockedTitle: {
    fontFamily: fontWeights.extraBold,
    fontSize: 20,
    color: colors.error,
    marginBottom: 8,
  },
  lockedSubtitle: {
    fontFamily: fontWeights.regular,
    fontSize: 14,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 280,
  },
})

export default PINAuthScreen
