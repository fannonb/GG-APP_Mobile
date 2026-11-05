import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  } from 'react-native'
import Pressable from '@/components/Pressable'
import { usePullToRefresh } from '@/lib/usePullToRefresh'
import { PAGE_SIZE, usePaged } from '@/lib/usePaged'
import { useAttentionDismissals } from '@/lib/useAttentionDismissals'
import type { DismissibleAttentionItem } from '@/lib/attention-dismissals'
import { lastSettledPayment, recentPaymentRows } from '@/lib/recent-payments'
import Svg, { Path, Circle, Line } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontWeights, shadows } from '@/theme'
import { SkeletonBalanceCard, SkeletonBlock, SkeletonGroup, SkeletonList } from '@/components/Skeleton'
import {
  Screen,
  ScrollArea,
  PageTitle,
  MCard,
  StatusPill,
  NotifBanner,
  GGPill,
  Pager,
} from '@/components'
import InvoiceIcon from '@/icons/InvoiceIcon'
import WalletIcon from '@/icons/WalletIcon'
import { CardAction, CreditBalanceCard } from '@/components/credit/CreditBalanceCard'
import { useCreditStatus, usePatientTransactions, usePatientInvoices } from '@gg/shared-hooks'
import { useUserStore } from '@gg/shared-stores'
import { formatCurrency, formatDate, getLowCreditThreshold, isCreditRunningLow, isActionablePendingInvoice } from '@gg/shared-utils'
import { getCountryByCode, getFinancePartnerIdForCountry, getFinancePartnerSummary } from '@gg/shared-config'
import type { Transaction, Patient, PatientInvoice } from '@gg/shared-types'
import { EmptyWalletScreen } from './EmptyWalletScreen'
import { getIsMockApi } from '@gg/shared-api'
import { buildRepaymentPreview } from '@/lib/repayment-preview'
import { RepaymentCard, RepaymentSchedule } from '@/components/credit/RepaymentCard'

/* ------------------------------------------------------------------ */
/*  Status pill mapping                                                */
/* ------------------------------------------------------------------ */
/** A dismissible notice at the top of this screen. */
interface WalletNotice extends DismissibleAttentionItem {
  icon: React.ReactNode
  tone: 'warning' | 'navy'
  cta: string
  onCta: () => void
}

const TX_STATUS: Record<
  string,
  { type: 'success' | 'info' | 'warning' | 'error' | 'navy'; label: string }
> = {
  completed:  { type: 'success', label: 'Paid' },
  authorized: { type: 'info',    label: 'Authorized' },
  pending:    { type: 'warning', label: 'Processing' },
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

/** One labelled fact, as on the PWA's allocation page. */
function SummaryCard({ label, action, children }: { label: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <MCard padding={16}>
      <View style={s.summaryHead}>
        <Text style={s.summaryLabel}>{label}</Text>
        {action}
      </View>
      {children}
    </MCard>
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
  const attentionDismissals = useAttentionDismissals()
  const [scheduleOpen, setScheduleOpen] = useState(false)

  /* Every payment, newest first, with its Type and family line from the linked invoice.
     Paged 10 per page; hooks run before the early return below. */
  const paymentRows = recentPaymentRows(transactions, invoices)
  // Out of range after the list shrinks: back to page 1, as the PWA does (this screen only).
  const { pageItems: pagedPayments, pager } = usePaged(paymentRows, null, PAGE_SIZE, 'first')

  /* Show empty allocation if no credit applied */
  if (u?.creditStatus === 'not_applied') {
    return <EmptyWalletScreen />
  }


  /* derived — resilient to null */
  const partner = u?.financePartnerId ? getFinancePartnerSummary(u.financePartnerId) : undefined
  const country = getCountryByCode(u?.countryCode ?? '')
  const currency = country?.currencySymbol ?? ''
  const creditAvailable = u?.creditAvailable ?? 0
  const creditLimit = u?.creditLimit ?? 0
  const lastPayment = lastSettledPayment(paymentRows)
  const pendingInvoices = (invoices as PatientInvoice[]).filter(isActionablePendingInvoice)
  const firstPending = pendingInvoices[0]
  const accountRef = u?.creditAccountRef ?? creditData?.creditAccountRef
  const partnerId = u?.financePartnerId ?? getFinancePartnerIdForCountry(u?.countryCode)
  const showLowBalance =
    u?.creditStatus === 'approved' &&
    isCreditRunningLow(creditAvailable, u?.countryCode ?? '')

  /* Family cover, allocation and repayment preview, as on the PWA's allocation page. */
  const beneficiariesActive = Boolean(u?.beneficiariesEnabled) || beneficiaries.length > 0
  const familyList: any[] = beneficiariesActive ? beneficiaries : []
  const familyLabel = !beneficiariesActive
    ? 'Not enabled'
    : familyList.length === 0
      ? 'None added'
      : familyList.length === 1
        ? `${familyList[0].name} · ${familyList[0].relation}`
        : `${familyList[0].name} +${familyList.length - 1}`
  const financePartnerName =
    getFinancePartnerSummary(getFinancePartnerIdForCountry(u?.countryCode))?.name ?? 'your finance partner'
  const cardAccountRef = u?.creditAccountRef?.trim() || null
  const allocationSub =
    [cardAccountRef && `Ref ${cardAccountRef}`, country?.currencyCode].filter(Boolean).join(' · ') || "Issued through GG'APP"
  // Placeholder schedule: the PWA shows it only against the mock API, so live accounts never see it.
  const repaymentPlan = getIsMockApi() ? buildRepaymentPreview(Math.max(0, creditLimit - creditAvailable)) : null

  /* Notices that can be dismissed, matching the PWA's "Needs your attention" on this screen. */
  const walletNotices: WalletNotice[] = []
  if (firstPending) {
    walletNotices.push({
      id: `pending-invoice-${firstPending.id}`,
      title: pendingInvoices.length === 1 ? 'An invoice needs your approval' : `${pendingInvoices.length} invoices need your approval`,
      detail: `${firstPending.provider.name} · authorize to pay from your healthcare allocation.`,
      icon: <InvoiceIcon size={18} color="#FFFFFF" />,
      tone: 'warning',
      cta: 'Authorize now',
      onCta: () =>
        navigation.navigate('InvoicesTab', {
          screen: 'InvoiceReview',
          params: { invoiceId: firstPending.id },
          initial: false,
        }),
    })
  }
  if (showLowBalance) {
    walletNotices.push({
      id: 'credit-low',
      title: 'Your allocation is running low',
      detail: `${formatCurrency(creditAvailable, currency)} left, below the ${formatCurrency(getLowCreditThreshold(u?.countryCode ?? ''), currency)} buffer we recommend.`,
      icon: <WalletIcon size={18} color="#FFFFFF" />,
      tone: 'navy',
      cta: 'Request increase',
      onCta: () => navigation.navigate('CreditIncrease'),
    })
  }
  const visibleWalletNotices = attentionDismissals.filterVisible(walletNotices)

  // Tapping a payment opens its invoice, or the full history when no invoice is linked.
  const openPayment = (tx: Transaction) => {
    if (tx.invoiceId) {
      navigation.navigate('InvoicesTab', { screen: 'InvoiceReview', params: { invoiceId: tx.invoiceId }, initial: false })
    } else {
      navigation.navigate('TransactionHistory')
    }
  }

  /* Currency and account ID sit under the title, as pills. */
  const headerPills = (
    <View style={s.headerPills}>
      {country && (
        <View style={s.headerPill}>
          <Text style={s.headerPillText}>{country.currencyCode ?? ''}</Text>
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
      <Screen header="tabRoot">
        <SkeletonGroup style={s.skeleton}>
          <SkeletonBalanceCard />
          <SkeletonBlock width="45%" height={18} />
          <SkeletonList rows={3} />
        </SkeletonGroup>
      </Screen>
    )
  }

  return (
    <Screen header="tabRoot" curveDepth={120}>
      <ScrollArea gap={24} px={16} py={14} {...pull}>
        <PageTitle title="Healthcare allocation" subtitle="Manage your healthcare allocation">
          {headerPills}
        </PageTitle>
        {visibleWalletNotices.map(notice => (
          <NotifBanner
            key={notice.id}
            icon={notice.icon}
            tone={notice.tone}
            title={notice.title}
            body={notice.detail}
            cta={notice.cta}
            onCta={notice.onCta}
            onDismiss={() => attentionDismissals.dismiss(notice)}
          />
        ))}
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
              <CardAction label="Request increase" variant="secondary" onPress={() => navigation.navigate('CreditIncrease')} />
            </>
          }
        />


        {repaymentPlan && (
          <RepaymentCard
            plan={repaymentPlan}
            currency={currency}
            scheduleOpen={scheduleOpen}
            onToggleSchedule={() => setScheduleOpen(open => !open)}
          />
        )}
        {repaymentPlan && scheduleOpen && <RepaymentSchedule plan={repaymentPlan} currency={currency} />}

        {/* ====== 2b. Last payment, family cover, allocation (the PWA's summary cards) ====== */}
        <View style={s.summaryStack}>
          <SummaryCard label="Last payment">
            {lastPayment ? (
              <>
                <Text style={s.summaryValue}>{formatCurrency(lastPayment.amount, currency)}</Text>
                <Text style={s.summarySub}>
                  {lastPayment.service} · {formatDate(lastPayment.date, { month: 'short', day: 'numeric' })}
                </Text>
              </>
            ) : (
              <>
                <Text style={s.summaryValue}>No payments yet</Text>
                <Text style={s.summarySub}>Your first payment will show here</Text>
              </>
            )}
          </SummaryCard>

          <SummaryCard
            label="Family cover"
            action={(
              <Pressable
                onPress={() => navigation.navigate('ProfileTab', { initial: false, screen: 'Beneficiaries' })}
                accessibilityRole="button"
                accessibilityLabel="Manage family cover"
              >
                <Text style={s.viewAll}>Manage</Text>
              </Pressable>
            )}
          >
            <Text style={s.summaryValue}>{familyLabel}</Text>
            <Text style={s.summarySub}>
              {beneficiariesActive && familyList.length > 0
                ? 'Can use this allocation at verified providers'
                : 'Enable beneficiaries in Profile'}
            </Text>
          </SummaryCard>

          <SummaryCard label="Allocation">
            <Text style={s.summaryValue}>{financePartnerName}</Text>
            <Text style={s.summarySub}>{allocationSub}</Text>
          </SummaryCard>
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

        {/* ====== 4. Recent payments to providers: every payment, newest first, 10 per page ====== */}
        <View style={s.contentSection}>
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>Recent payments to providers</Text>
              <Text style={s.sectionSub}>
                Paid from your allocation after you approved the invoice
              </Text>
            </View>
            <Pressable onPress={() => navigation.navigate('TransactionHistory')}>
              <Text style={s.viewAll}>View all →</Text>
            </Pressable>
          </View>

          {paymentRows.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyText}>No payments yet. Find a verified provider, then approve their invoice with your PIN.</Text>
            </View>
          ) : (
            <>
              {pagedPayments.map(({ tx, paymentType, forWhom }, i) => {
                const status = TX_STATUS[tx.status] ?? { type: 'default' as const, label: tx.status ?? 'Unknown' }
                return (
                  <Pressable
                    key={tx.id}
                    onPress={() => openPayment(tx)}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      s.txRow,
                      i < pagedPayments.length - 1 && s.txRowBorder,
                      pressed && s.txRowPressed,
                    ]}
                  >
                    <TxRowIcon status={tx.status ?? 'completed'} />
                    <View style={s.txInfo}>
                      <Text style={s.txProvider} numberOfLines={1}>
                        {tx.provider ?? 'Provider'}
                      </Text>
                      <Text style={s.txMeta} numberOfLines={1}>
                        {tx.service ?? 'Service'} · {tx.date ? formatDate(tx.date) : ''}
                      </Text>
                      <View style={s.txTags}>
                        <GGPill type={paymentType === 'prescription' ? 'info' : 'default'}>
                          {paymentType === 'prescription' ? 'Prescription' : 'Appointment'}
                        </GGPill>
                        {forWhom ? (
                          <Text style={s.txFor} numberOfLines={1}>
                            For {forWhom.name}{forWhom.relation ? ` · ${forWhom.relation}` : ''}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={s.txRight}>
                      <Text style={s.txAmount}>
                        -{formatCurrency(tx.amount ?? 0, currency)}
                      </Text>
                      <StatusPill label={status.label} tone={status.type} size="sm" />
                    </View>
                  </Pressable>
                )
              })}
              <View style={s.pagerWrap}>
                <Pager {...pager} summary="showing" />
              </View>
            </>
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

  summaryStack: {
    gap: 12,
  },
  summaryHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: fontWeights.bold,
    color: colors.textLight,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  summarySub: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    marginTop: 4,
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
  txRowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  txTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  txFor: {
    fontSize: 12.5,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
  },
  pagerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 4,
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
})
