import React from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import {
  useLedgerAccessLog,
  useRevokeLedgerGrantMutation,
} from '@gg/shared-hooks'
import type { LedgerAccessEvent } from '@gg/shared-types'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn, GGPill } from '@/components'

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
  const accessQuery = useLedgerAccessLog()
  const revokeGrantMutation = useRevokeLedgerGrantMutation()

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

  return (
    <Screen>
      <AppBar
        title="Ledger Access Log"
        subtitle="Every provider who has unlocked or viewed your health ledger"
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
