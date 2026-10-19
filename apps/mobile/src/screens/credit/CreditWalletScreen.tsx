import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  } from 'react-native'
import Pressable from '@/components/Pressable'
import { usePullToRefresh } from '@/lib/usePullToRefresh'
import Svg, { Path, Circle, Line } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontWeights, shadows } from '@/theme'
import { SkeletonBalanceCard, SkeletonBlock, SkeletonGroup, SkeletonList } from '@/components/Skeleton'
import {
  Screen,
  ScrollArea,
  AppBar,
  MCard,
  MAvatar,
  StatusPill,
  MoneyText,
  StatTile,
  NotifBanner,
} from '@/components'
import InvoiceIcon from '@/icons/InvoiceIcon'
import WalletIcon from '@/icons/WalletIcon'
import { CardAction, CreditBalanceCard } from '@/components/credit/CreditBalanceCard'
import { useCreditStatus, usePatientTransactions, usePatientInvoices } from '@gg/shared-hooks'
import { useUserStore } from '@gg/shared-stores'
import { formatCurrency, formatDate, isCreditRunningLow, isActionablePendingInvoice } from '@gg/shared-utils'
import { getCountryByCode, getFinancePartnerIdForCountry, getFinancePartnerSummary } from '@gg/shared-config'
import type { CreditStatusResponse, Transaction, Patient, PatientInvoice } from '@gg/shared-types'
import { EmptyWalletScreen } from './EmptyWalletScreen'

/* ------------------------------------------------------------------ */
/*  Status pill mapping                                                */
/* ------------------------------------------------------------------ */
const TX_STATUS: Record<
  string,
  { type: 'success' | 'info' | 'warning' | 'error' | 'navy'; label: string }
> = {
  completed:  { type: 'success', label: 'Paid' },
  authorized: { type: 'info',    label: 'Authorized' },
  pending:    { type: 'warning', label: 'Pending' },
  failed:     { type: 'error',   label: 'Failed' },
}

/* ------------------------------------------------------------------ */
/*  Inline check icon for tx rows                                      */
/* ------------------------------------------------------------------ */
function TxRowIcon({ status }: { status: string }) {
  const isSuccess = status === 'completed'
  const isAuth = status === 'authorized'
  const isFailed = status === 'failed'
  const isPending = status === 'pending'

  const bgColor = isFailed
    ? colors.errorBg
    : isPending
      ? colors.warningBg
      : isAuth
        ? colors.blue3
        : colors.successBg

  const strokeColor = isFailed
    ? colors.error
    : isPending
      ? colors.warning
      : isAuth
        ? colors.blue
        : colors.success

  return (
    <View style={[s.txIcon, { backgroundColor: bgColor }]}>
      {isFailed ? (
        <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
          <Path d="M4 4l10 10M14 4L4 14" stroke={strokeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : isPending ? (
        <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
          <Circle cx={9} cy={9} r={6.5} stroke={strokeColor} strokeWidth={2} />
          <Path d="M9 5.5v4l2.5 1.5" stroke={strokeColor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : (
        <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
          <Path d="M3.5 9l4 4 7-7" stroke={strokeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )}
    </View>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */
export function CreditWalletScreen() {
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const u = useUserStore(s => s.user) as Patient | undefined
  const beneficiaries = useUserStore(s => (s as any).beneficiaries) ?? []
  const { data: creditData, isLoading: creditLoading, refetch: refetchCredit } = useCreditStatus()
  const { data: transactions = [], isLoading: txLoading, refetch: refetchTx } = usePatientTransactions()
  const { data: invoices = [], refetch: refetchInvoices } = usePatientInvoices()
  const pull = usePullToRefresh(refetchCredit, refetchTx, refetchInvoices)

  /* Show empty wallet if no credit applied */
  if (u?.creditStatus === 'not_applied') {
    return <EmptyWalletScreen />
  }


  /* derived — resilient to null */
  const partner = u?.financePartnerId ? getFinancePartnerSummary(u.financePartnerId) : undefined
  const country = getCountryByCode(u?.countryCode ?? 'KE')
  const currency = country?.currencySymbol ?? 'Ksh.'
  const creditAvailable = u?.creditAvailable ?? 0
  const creditLimit = u?.creditLimit ?? 0
  const outstanding = creditData?.creditUsed ?? u?.creditUsed ?? 0

  const spendable = transactions.filter(
    (t: any) => t.status === 'completed' || t.status === 'authorized',
  )
  const now = new Date()
  const thisMonthUsage = spendable
    .filter((t: any) => {
      const d = new Date(t.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum: number, t: any) => sum + (t.amount ?? 0), 0)

  const thisMonthCount = spendable.filter((t: Transaction) => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const recentTx = [...transactions]
    .sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
  const activeBeneficiaries: any[] = beneficiaries ?? []
  const pendingInvoices = (invoices as PatientInvoice[]).filter(isActionablePendingInvoice)
  const firstPending = pendingInvoices[0]
  const accountRef = u?.creditAccountRef ?? creditData?.creditAccountRef
  const partnerId = u?.financePartnerId ?? getFinancePartnerIdForCountry(u?.countryCode)
  const showLowBalance =
    u?.creditStatus === 'approved' &&
    isCreditRunningLow(creditAvailable, u?.countryCode ?? 'KE')

  /* Currency and account ID sit in the top-right corner of the header. */
  const headerPills = (
    <View style={s.headerPills}>
      {country && (
        <View style={s.headerPill}>
          <Text style={s.headerPillText}>{country.currencyCode ?? 'KES'}</Text>
        </View>
      )}
      <View style={s.headerPill}>
        <Text style={s.headerPillText}>ID: {accountRef ?? 'Pending'}</Text>
      </View>
    </View>
  )

  /* loading */
  if ((creditLoading || txLoading) && !creditData && transactions.length === 0) {
    return (
      <Screen>
        <AppBar title="Balance & Credit" subtitle="Manage your healthcare credit line" variant="hero" back={false} right={headerPills} />
        <SkeletonGroup style={s.skeleton}>
          <SkeletonBalanceCard />
          <SkeletonBlock width="45%" height={18} />
          <SkeletonList rows={3} />
        </SkeletonGroup>
      </Screen>
    )
  }

  return (
    <Screen>
      <AppBar title="Balance & Credit" subtitle="Manage your healthcare credit line" variant="hero" back={false} right={headerPills} />

      <ScrollArea gap={24} px={16} py={14} {...pull}>
        {firstPending && (
          <NotifBanner
            icon={<InvoiceIcon size={18} color="#FFFFFF" />}
            tone="warning"
            title={pendingInvoices.length === 1 ? 'An invoice needs your approval' : `${pendingInvoices.length} invoices need your approval`}
            body={`${firstPending.provider.name} · authorize to pay from your healthcare credit.`}
            cta="Authorize now"
            onCta={() =>
              navigation.navigate('InvoicesTab', {
                screen: 'InvoiceReview',
                params: { invoiceId: firstPending.id },
                initial: false,
              })
            }
          />
        )}
        {showLowBalance && (
          <NotifBanner
            icon={<WalletIcon size={18} color="#FFFFFF" />}
            tone="navy"
            title="Your healthcare balance is running low"
            body={`Request a limit increase so you can keep paying providers without interruption.`}
            cta="Request Increase"
            onCta={() => navigation.navigate('CreditIncrease')}
          />
        )}
        {/* ====== 1. Balance card: the same card as on home, financier at the top ====== */}
        <CreditBalanceCard
          partnerId={partnerId}
          partnerName={partner?.name ?? 'Accredited Finance Partner'}
          available={creditAvailable}
          limit={creditLimit}
          currency={currency}
          isLow={showLowBalance}
          footer={
            <>
              <CardAction label="Use Balance →" onPress={() => navigation.navigate('ServicesTab', { screen: 'FindService' })} />
              <CardAction label="Request Increase" variant="secondary" onPress={() => navigation.navigate('CreditIncrease')} />
            </>
          }
        />

        {/* ====== 2. Figures sit outside the card ====== */}

        <View style={[s.contentSection, s.statsCard]}>
          <View style={s.statBlock}>
            <Text style={s.statLabel}>Outstanding</Text>
            <Text style={s.statValue}>{formatCurrency(outstanding, currency)}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBlock}>
            <Text style={s.statLabel}>This month</Text>
            <Text style={s.statValueBlue}>{formatCurrency(thisMonthUsage, currency)}</Text>
            <Text style={s.statLabel}>{thisMonthCount} payment{thisMonthCount === 1 ? '' : 's'}</Text>
          </View>
        </View>

        {/* ====== 3. Info Notice ====== */}
        <View style={s.infoNotice}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 } as any}>
            <Circle cx={8} cy={8} r={6.5} stroke={colors.blue} strokeWidth={1.3} />
            <Line x1={8} y1={5} x2={8} y2={9} stroke={colors.blue} strokeWidth={1.6} strokeLinecap="round" />
            <Circle cx={8} cy={11.5} r={0.9} fill={colors.blue} />
          </Svg>
          <Text style={s.infoText}>
            {partner
              ? `Funds can only be used with GG'APP-approved providers. You approve each payment with your PIN. Repayments are handled directly with ${partner.name}.`
              : "Funds can only be used with GG'APP-approved providers through the invoice flow. You approve each payment with your PIN. Repayments are handled directly with your accredited finance partner."}
          </Text>
        </View>

        {/* ====== 4. Transaction History ====== */}
        <View style={s.contentSection}>
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>Transaction History</Text>
              <Text style={s.sectionSub}>
                All medical payments made through GG'APP
              </Text>
            </View>
            <Pressable onPress={() => navigation.navigate('TransactionHistory')}>
              <Text style={s.viewAll}>View all →</Text>
            </Pressable>
          </View>

          {recentTx.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            recentTx.map((tx: any, i: number) => {
              const status = TX_STATUS[tx.status] ?? { type: 'default' as const, label: tx.status ?? 'Unknown' }
              return (
                <View
                  key={tx.id ?? i}
                  style={[s.txRow, i < recentTx.length - 1 && s.txRowBorder]}
                >
                  <TxRowIcon status={tx.status ?? 'completed'} />
                  <View style={s.txInfo}>
                    <Text style={s.txProvider} numberOfLines={1}>
                      {tx.provider ?? 'Provider'}
                    </Text>
                    <Text style={s.txMeta}>
                      {tx.service ?? 'Service'} ·{' '}
                      {tx.date ? formatDate(tx.date) : ''}
                    </Text>
                  </View>
                  <View style={s.txRight}>
                    <Text style={s.txAmount}>
                      -{formatCurrency(tx.amount ?? 0, currency)}
                    </Text>
                    <StatusPill label={status.label} tone={status.type} size="sm" />
                  </View>
                </View>
              )
            })
          )}
        </View>

        {/* ====== 5. Authorized Beneficiaries ====== */}
        <View style={s.contentSection}>
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>Authorized Beneficiaries</Text>
              <Text style={s.sectionSub}>
                Registered beneficiaries on this balance
              </Text>
            </View>
            <Pressable onPress={() => navigation.navigate('ProfileTab', { initial: false, screen: 'Beneficiaries' })}>
              <Text style={s.viewAll}>Manage →</Text>
            </Pressable>
          </View>

          {activeBeneficiaries.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyText}>No beneficiaries added yet</Text>
            </View>
          ) : (
            activeBeneficiaries.map((b: any, i: number) => (
              <View
                key={b.id ?? i}
                style={[s.benRow, i < activeBeneficiaries.length - 1 && s.txRowBorder]}
              >
                <MAvatar name={b.name ?? 'U'} size={32} bg={colors.navy} />
                <View style={s.benInfo}>
                  <Text style={s.benName} numberOfLines={1}>{b.name ?? 'Beneficiary'}</Text>
                  <Text style={s.benMeta}>
                    {b.relation ?? 'Relation'} · Age {b.age ?? '--'}
                  </Text>
                </View>
                <StatusPill label="Active" tone="success" size="sm" />
              </View>
            ))
          )}
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollArea>
    </Screen>
  )
}

export default CreditWalletScreen

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */
const s = StyleSheet.create({
  skeleton: {
    padding: 16,
    gap: 14,
  },
  /* loading */
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15.5,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
  },

  /* header pills, top-right corner */
  headerPills: {
    alignItems: 'flex-end',
    gap: 6,
  },
  headerPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  headerPillText: {
    fontSize: 11.5,
    fontFamily: fontWeights.bold,
    color: 'rgba(255,255,255,0.9)',
  },

  /* outstanding / this month, below the card */
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  statBlock: {
    flex: 1,
    gap: 4,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: fontWeights.medium,
    color: colors.textLight,
  },
  statValue: {
    fontSize: 17,
    fontFamily: fontWeights.extraBold,
    color: colors.text,
  },
  statValueBlue: {
    fontSize: 17,
    fontFamily: fontWeights.extraBold,
    color: colors.blueInk,
  },

  /* container sections */
  contentSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 0,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(9, 28, 68, 0.05)',
    ...shadows.card,
  },

  /* info notice */
  infoNotice: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F5F9FF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(56, 182, 255, 0.1)',
  },
  infoText: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: fontWeights.medium,
    color: colors.navy,
    lineHeight: 20,
  },

  /* section header (shared tx & ben) */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  sectionSub: {
    fontSize: 12.5,
    fontFamily: fontWeights.regular,
    color: colors.textLight,
    marginTop: 2,
  },
  viewAll: {
    fontSize: 13.5,
    fontFamily: fontWeights.semiBold,
    color: colors.blueInk,
  },

  /* empty */
  emptyWrap: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14.5,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
  },

  /* transaction rows */
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  txRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txIcon: {
    width: 42,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txProvider: {
    fontSize: 15.5,
    fontFamily: fontWeights.semiBold,
    color: colors.text,
  },
  txMeta: {
    fontSize: 13.5,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  txAmount: {
    fontSize: 16,
    fontFamily: fontWeights.extraBold,
    color: colors.text,
    letterSpacing: -0.3,
  },

  /* beneficiary rows */
  benRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  benInfo: {
    flex: 1,
    gap: 2,
  },
  benName: {
    fontSize: 14.5,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  benMeta: {
    fontSize: 12.5,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
  },
})
