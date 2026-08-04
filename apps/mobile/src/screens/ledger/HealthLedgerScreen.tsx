import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import {
  useLedgerStatus,
  useOwnLedger,
  useRevokeLedgerGrantMutation,
} from '@gg/shared-hooks'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn, GGPill } from '@/components'
import { LedgerTimeline } from '@/components/LedgerTimeline'

function timeRemaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'expired'
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return hours > 0 ? `${hours}h ${minutes}m remaining` : `${minutes}m remaining`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function HealthLedgerScreen() {
  const navigation = useNavigation<any>()
  const [beneficiaryFilter, setBeneficiaryFilter] = useState<string | undefined>(undefined)
  const statusQuery = useLedgerStatus()
  const ledgerQuery = useOwnLedger(beneficiaryFilter)
  const revokeGrantMutation = useRevokeLedgerGrantMutation()

  const status = statusQuery.data
  const hasPin = status?.hasPin ?? false
  const activeGrants = status?.activeGrants ?? []
  const beneficiaries = ledgerQuery.data?.patient.beneficiaries ?? []

  const filterOptions: Array<{ id: string | undefined; label: string }> = [
    { id: undefined, label: 'Everyone' },
    { id: 'self', label: 'Me only' },
    ...beneficiaries.map(b => ({ id: b.id, label: b.name })),
  ]

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
        title="Health Ledger"
        subtitle="Your complete treatment history across all providers"
        back
      />
      <ScrollArea gap={16} px={16} py={14}>
        <MCard padding={16}>
          <View style={styles.pinHeader}>
            <View style={styles.pinTitleRow}>
              <Text style={styles.sectionTitle}>Ledger PIN</Text>
              <GGPill type={hasPin ? 'success' : 'warning'}>
                {hasPin ? 'Active' : 'Not set'}
              </GGPill>
              {hasPin && status?.pinExpiresAt ? (
                <GGPill type="info">Expires {formatDate(status.pinExpiresAt)}</GGPill>
              ) : null}
            </View>
            <Text style={styles.bodyText}>
              {hasPin
                ? 'Share your PIN with a service provider to give them 24-hour access to your treatment history. Every access is logged and you can revoke it anytime.'
                : 'Create a PIN to control which service providers can view your treatment and diagnosis history across the platform.'}
            </Text>
          </View>
          <View style={styles.btnRow}>
            <MBtn
              variant="primary"
              sm
              onPress={() => navigation.navigate('LedgerPinSetup')}
            >
              {hasPin ? 'Change PIN' : 'Create PIN'}
            </MBtn>
            <MBtn
              variant="outline"
              sm
              onPress={() => navigation.navigate('LedgerAccess')}
            >
              Access log
            </MBtn>
          </View>
        </MCard>

        {activeGrants.length > 0 ? (
          <MCard padding={16}>
            <Text style={styles.sectionTitle}>Providers with access right now</Text>
            <Text style={styles.caption}>Access expires automatically 24 hours after unlock.</Text>
            <View style={styles.grantList}>
              {activeGrants.map(grant => (
                <View key={grant.id} style={styles.grantRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.pinTitleRow}>
                      <Text style={styles.grantName}>{grant.provider.name}</Text>
                      <GGPill type="default">{grant.provider.category}</GGPill>
                    </View>
                    <Text style={styles.caption}>{timeRemaining(grant.expiresAt)}</Text>
                  </View>
                  <MBtn
                    variant="danger"
                    sm
                    disabled={revokeGrantMutation.isPending}
                    onPress={() => handleRevoke(grant.id, grant.provider.name)}
                  >
                    Revoke
                  </MBtn>
                </View>
              ))}
            </View>
          </MCard>
        ) : null}

        <View>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Your treatment history</Text>
            <Pressable onPress={() => navigation.navigate('LedgerAccess')}>
              <Text style={styles.link}>Who has viewed this?</Text>
            </Pressable>
          </View>

          {(beneficiaries.length > 0 || beneficiaryFilter) && (
            <View style={styles.chipRow}>
              {filterOptions.map(option => {
                const active = beneficiaryFilter === option.id
                return (
                  <Pressable
                    key={option.id ?? 'all'}
                    onPress={() => setBeneficiaryFilter(option.id)}
                    style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                  >
                    <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          )}

          {ledgerQuery.isLoading ? (
            <MCard padding={24}>
              <ActivityIndicator color={colors.blue} />
              <Text style={[styles.caption, { textAlign: 'center', marginTop: 10 }]}>
                Loading your ledger...
              </Text>
            </MCard>
          ) : (
            <LedgerTimeline entries={ledgerQuery.data?.entries ?? []} />
          )}
        </View>

        <Text style={styles.footerNote}>
          Only providers you share your Ledger PIN with can see this history. Internal provider
          notes are never shared. If you suspect misuse, change your PIN immediately — it revokes
          all active access.
        </Text>

        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

export default HealthLedgerScreen

const styles = StyleSheet.create({
  pinHeader: {
    gap: 10,
    marginBottom: 14,
  },
  pinTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fontWeights.bold,
    fontSize: 16,
    color: colors.navy,
  },
  bodyText: {
    fontFamily: fontWeights.regular,
    fontSize: 13.5,
    color: colors.textSub,
    lineHeight: 20,
  },
  caption: {
    fontFamily: fontWeights.regular,
    fontSize: 12.5,
    color: colors.textSub,
    marginTop: 4,
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  grantList: {
    gap: 10,
  },
  grantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
  },
  grantName: {
    fontFamily: fontWeights.bold,
    fontSize: 14,
    color: colors.navy,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  link: {
    fontFamily: fontWeights.semiBold,
    fontSize: 13,
    color: colors.blueInk,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radii.full,
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
  footerNote: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.textLight,
    lineHeight: 18,
  },
})
