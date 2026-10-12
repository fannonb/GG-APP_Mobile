import React from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import {
  useLedgerAccessLog,
  useLedgerStatus,
  useRevokeLedgerGrantMutation,
  useRevokeLedgerPinMutation,
} from '@gg/shared-hooks'
import type { LedgerAccessEvent } from '@gg/shared-types'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn, GGPill } from '@/components'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const EVENT_LABELS: Record<
  LedgerAccessEvent['action'],
  { label: string; type: 'success' | 'error' | 'info' | 'warning' | 'default' }
> = {
  PIN_CREATED: { label: 'You created a ledger PIN', type: 'info' },
  PIN_ROTATED: { label: 'You changed your ledger PIN', type: 'info' },
  PIN_REVOKED: { label: 'You revoked your ledger PIN', type: 'warning' },
  UNLOCK_SUCCESS: { label: 'Unlocked your ledger', type: 'success' },
  UNLOCK_FAILED: { label: 'Failed unlock attempt', type: 'error' },
  LEDGER_VIEWED: { label: 'Viewed your ledger', type: 'default' },
  GRANT_REVOKED: { label: 'Access revoked', type: 'warning' },
  GRANT_EXPIRED: { label: 'Access expired', type: 'default' },
}

const GRANT_STATUS: Record<string, { label: string; type: 'success' | 'error' | 'default' }> = {
  active: { label: 'Active', type: 'success' },
  expired: { label: 'Expired', type: 'default' },
  revoked: { label: 'Revoked', type: 'error' },
}

export function LedgerAccessScreen() {
  const navigation = useNavigation<any>()
  const accessQuery = useLedgerAccessLog()
  const statusQuery = useLedgerStatus()
  const revokeGrantMutation = useRevokeLedgerGrantMutation()
  const revokePinMutation = useRevokeLedgerPinMutation()

  const status = statusQuery.data
  const hasPin = status?.hasPin ?? false
  const pinExpired = status?.pinExpired ?? false

  const grants = accessQuery.data?.grants ?? []
  const events = accessQuery.data?.events ?? []

  const handleRevoke = (grantId: string, providerName: string) => {
    Alert.alert(
      'Revoke access?',
      `${providerName} will immediately lose access to your health ledger.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => revokeGrantMutation.mutate(grantId),
        },
      ],
    )
  }

  const handleTurnOffPin = () => {
    Alert.alert(
      'Turn off your Ledger PIN?',
      'Turning off your PIN ends all current access and stops new providers from opening your history.',
      [
        { text: 'Keep it on', style: 'cancel' },
        {
          text: 'Turn off',
          style: 'destructive',
          onPress: () =>
            revokePinMutation.mutate(undefined, {
              onError: () => Alert.alert('Could not turn off your PIN', 'Please try again.'),
            }),
        },
      ],
    )
  }

  const pinStatusText = pinExpired
    ? 'Providers can’t open your history until you set a new PIN.'
    : hasPin
      ? [
          status?.pinCreatedAt ? `Set on ${formatDate(status.pinCreatedAt)}` : null,
          status?.pinExpiresAt ? `expires ${formatDate(status.pinExpiresAt)}` : 'no expiry date',
        ].filter(Boolean).join(' · ')
      : 'Without a PIN, no provider can open your history.'

  return (
    <Screen>
      <AppBar
        title="Ledger Access Log"
        subtitle="Who has opened your health ledger"
        back
      />
      <ScrollArea gap={16} px={16} py={14}>
        {accessQuery.isLoading ? (
          <MCard padding={24}>
            <ActivityIndicator color={colors.blue} />
          </MCard>
        ) : (
          <>
            <MCard padding={16}>
              <Text style={styles.sectionTitle}>Your Ledger PIN</Text>
              <Text style={[styles.pinState, (pinExpired || !hasPin) && styles.pinStateWarn]}>
                {pinExpired ? 'Expired' : hasPin ? 'On' : 'Not set'}
              </Text>
              <Text style={styles.pinMeta}>{pinStatusText}</Text>
              <View style={styles.pinActions}>
                <MBtn
                  variant={hasPin && !pinExpired ? 'outline' : 'primary'}
                  sm
                  onPress={() => navigation.navigate('LedgerPinSetup')}
                >
                  {hasPin && !pinExpired ? 'Change PIN' : pinExpired ? 'Set a new PIN' : 'Create PIN'}
                </MBtn>
                {hasPin && !pinExpired ? (
                  <MBtn
                    variant="danger"
                    sm
                    disabled={revokePinMutation.isPending}
                    onPress={handleTurnOffPin}
                  >
                    {revokePinMutation.isPending ? 'Turning off…' : 'Turn off PIN'}
                  </MBtn>
                ) : null}
              </View>
            </MCard>

            <MCard padding={16}>
              <Text style={styles.sectionTitle}>Access grants</Text>
              {grants.length === 0 ? (
                <Text style={styles.empty}>No provider has unlocked your ledger yet.</Text>
              ) : (
                <View style={styles.list}>
                  {grants.map(grant => {
                    const badge = GRANT_STATUS[grant.status] ?? GRANT_STATUS.expired
                    return (
                      <View key={grant.id} style={styles.row}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <View style={styles.titleRow}>
                            <Text style={styles.name}>{grant.provider.name}</Text>
                            <GGPill type={badge.type}>{badge.label}</GGPill>
                          </View>
                          <Text style={styles.meta}>
                            Unlocked {formatDateTime(grant.unlockedAt)}
                            {grant.status !== 'revoked'
                              ? ` · expires ${formatDateTime(grant.expiresAt)}`
                              : ''}
                          </Text>
                        </View>
                        {grant.status === 'active' ? (
                          <MBtn
                            variant="danger"
                            sm
                            disabled={revokeGrantMutation.isPending}
                            onPress={() => handleRevoke(grant.id, grant.provider.name)}
                          >
                            Revoke
                          </MBtn>
                        ) : null}
                      </View>
                    )
                  })}
                </View>
              )}
            </MCard>

            <MCard padding={16}>
              <Text style={styles.sectionTitle}>Activity</Text>
              {events.length === 0 ? (
                <Text style={styles.empty}>No ledger activity yet.</Text>
              ) : (
                <View>
                  {events.map((event, index) => {
                    const meta =
                      EVENT_LABELS[event.action] ??
                      ({ label: event.action, type: 'default' } as const)
                    return (
                      <View
                        key={event.id}
                        style={[
                          styles.eventRow,
                          index < events.length - 1 ? styles.eventBorder : null,
                        ]}
                      >
                        <View style={styles.eventLeft}>
                          <GGPill type={meta.type}>{meta.label}</GGPill>
                          {event.provider ? (
                            <Text style={styles.providerName}>{event.provider.name}</Text>
                          ) : null}
                        </View>
                        <Text style={styles.eventTime}>{formatDateTime(event.createdAt)}</Text>
                      </View>
                    )
                  })}
                </View>
              )}
            </MCard>
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

export default LedgerAccessScreen

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: fontWeights.bold,
    fontSize: 15,
    color: colors.navy,
    marginBottom: 14,
  },
  pinState: {
    fontFamily: fontWeights.bold,
    fontSize: 14,
    color: colors.navy,
  },
  pinStateWarn: {
    color: '#B45309',
  },
  pinMeta: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSub,
    marginTop: 4,
  },
  pinActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  empty: {
    fontFamily: fontWeights.regular,
    fontSize: 13.5,
    color: colors.textSub,
    paddingVertical: 8,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontFamily: fontWeights.bold,
    fontSize: 14,
    color: colors.navy,
  },
  meta: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.textSub,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    flexWrap: 'wrap',
  },
  eventBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    flex: 1,
  },
  providerName: {
    fontFamily: fontWeights.semiBold,
    fontSize: 13,
    color: colors.text,
  },
  eventTime: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.textLight,
  },
})
