import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  } from 'react-native'
import Pressable from '@/components/Pressable'
import { usePullToRefresh } from '@/lib/usePullToRefresh'
import Svg, { Rect, Line, Path } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import { colors, fontWeights, radii } from '@/theme'
import { SkeletonBalanceCard, SkeletonBlock, SkeletonGroup, SkeletonList } from '@/components/Skeleton'
import { Screen, ScrollArea, AppBar, MCard, FilterChips, MoneyText, StatusPill, NotifBanner } from '@/components'
import InvoiceIcon from '@/icons/InvoiceIcon'
import { usePatientInvoices } from '@gg/shared-hooks'
import { formatDate, isActionablePendingInvoice } from '@gg/shared-utils'
import type { PatientInvoice } from '@gg/shared-types'

/* ------------------------------------------------------------------ */
/*  Status config                                                      */
/* ------------------------------------------------------------------ */
const STATUS_MAP: Record<
  string,
  { tone: 'warning' | 'info' | 'success' | 'error' | 'navy'; label: string }
> = {
  pending_auth: { tone: 'warning', label: 'Needs approval' },
  authorized: { tone: 'info', label: 'Authorized' },
  paid: { tone: 'success', label: 'Paid' },
  rejected: { tone: 'error', label: 'Rejected' },
  admin_review: { tone: 'navy', label: 'Under Review' },
}

/* ------------------------------------------------------------------ */
/*  Invoice row icon                                                   */
/* ------------------------------------------------------------------ */
function InvoiceRowIcon({ isPending }: { isPending: boolean }) {
  const color = isPending ? colors.warning : colors.success
  const bg = isPending ? colors.warningBg : colors.successBg

  return (
    <View style={[s.rowIcon, { backgroundColor: bg }]}>
      <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
        <Rect x={3} y={2} width={12} height={14} rx={2} stroke={color} strokeWidth={1.3} />
        <Line x1={6} y1={6} x2={12} y2={6} stroke={color} strokeWidth={1} strokeLinecap="round" />
        <Line x1={6} y1={9} x2={12} y2={9} stroke={color} strokeWidth={1} strokeLinecap="round" />
      </Svg>
    </View>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */
export function InvoiceListScreen() {
  const navigation = useNavigation<any>()
  const { data: invoiceData, isLoading, refetch } = usePatientInvoices()
  const pull = usePullToRefresh(refetch)

  const [filterIndex, setFilterIndex] = useState(0)

  /* Transform invoices */
  const invoices: Array<{
    id: string
    provider: string
    amount: number
    date: string
    status: string
    service: string
    isPrescription: boolean
    prescriptionQuoteReviewed: boolean
  }> = (invoiceData ?? []).map((inv: PatientInvoice) => ({
    id: inv.id,
    provider: inv.provider?.name ?? 'Provider',
    amount: inv.amount ?? 0,
    date: inv.date ?? '',
    status: inv.status ?? 'pending_auth',
    service: inv.services?.[0]?.name ?? 'Healthcare Service',
    isPrescription: Boolean(inv.isPrescription),
    prescriptionQuoteReviewed: Boolean(inv.prescriptionQuoteReviewed),
  }))

  /* Filter by chip */
  const filterLabels = [
    { label: 'All' },
    { label: 'Pending' },
    { label: 'Paid' },
  ]

  const pendingInvoices = invoices.filter(isActionablePendingInvoice)
  const firstPending = pendingInvoices[0]

  const filtered =
    filterIndex === 0
      ? invoices
      : filterIndex === 1
        ? invoices.filter(inv => inv.status === 'pending_auth')
        : invoices.filter(inv => inv.status === 'paid')

  /* Loading state */
  if (isLoading && !invoiceData) {
    return (
      <Screen>
        <AppBar title="Invoices" subtitle="Review and authorize pending invoices" variant="hero" back={false} />
        <SkeletonGroup style={s.skeleton}>
          <SkeletonBlock width="50%" height={18} />
          <SkeletonList rows={5} />
        </SkeletonGroup>
      </Screen>
    )
  }

  return (
    <Screen headerPattern="dark-curve">
        <AppBar
          title="Invoices"
          subtitle={pendingInvoices.length > 0 ? `${pendingInvoices.length} to authorize` : 'Review and settle your medical bills'}
          variant="hero"
          back={false}
        />

      <ScrollArea gap={14} px={16} py={14} {...pull}>
        {firstPending && (
          <NotifBanner
            icon={<InvoiceIcon size={18} color="#FFFFFF" />}
            tone="warning"
            title={pendingInvoices.length === 1 ? 'An invoice needs your approval' : `${pendingInvoices.length} invoices need your approval`}
            body={`${firstPending.provider} — authorize to pay from your healthcare credit.`}
            cta="Authorize now"
            onCta={() => navigation.navigate('InvoiceReview', { invoiceId: firstPending.id })}
          />
        )}

        {/* === Filter Chips === */}
        <FilterChips
          items={filterLabels}
          activeIndex={filterIndex}
          onSelect={setFilterIndex}
        />

        {/* === Invoice List Card === */}
        <MCard padding={0}>
          {/* Header */}
          <View style={s.listHeader}>
            <Text style={s.listHeaderText}>
              {filterIndex === 0 ? 'All Invoices' : filterIndex === 1 ? 'Pending Invoices' : 'Paid Invoices'}
            </Text>
            <Text style={s.countBadge}>{filtered.length}</Text>
          </View>

          {/* Empty state */}
          {filtered.length === 0 ? (
            <View style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Rect x={4} y={3} width={16} height={18} rx={2} stroke={colors.blue} strokeWidth={1.5} />
                  <Path d="M8 8h8M8 12h8M8 16h5" stroke={colors.blue} strokeWidth={1.3} strokeLinecap="round" />
                </Svg>
              </View>
              <Text style={s.emptyTitle}>No invoices found</Text>
              <Text style={s.emptySub}>
                Invoices from your healthcare providers will appear here once
                they are submitted.
              </Text>
            </View>
          ) : (
            /* Invoice rows */
            filtered.map((inv, index) => {
              const status = STATUS_MAP[inv.status] ?? {
                tone: 'navy' as const,
                label: inv.status,
              }
              const isPending = inv.status === 'pending_auth'

              return (
                <Pressable
                  key={inv.id}
                  style={({ pressed }) => [
                    s.invoiceRow,
                    index < filtered.length - 1 && s.invoiceRowBorder,
                    pressed && s.invoiceRowPressed,
                  ]}
                  onPress={() =>
                    navigation.navigate('InvoiceReview', { invoiceId: inv.id })
                  }
                >
                  <InvoiceRowIcon isPending={isPending} />

                  <View style={s.invoiceInfo}>
                    <Text style={s.invoiceService} numberOfLines={1}>
                      {inv.isPrescription ? 'Prescription order' : inv.service}
                    </Text>
                    <Text style={s.invoiceProvider} numberOfLines={1}>
                      {inv.provider}
                    </Text>
                    <View style={s.metaRow}>
                      <Text style={s.invoiceId}>{inv.id}</Text>
                      <Text style={s.dotDot}>·</Text>
                      <Text style={s.invoiceDate}>{formatDate(inv.date)}</Text>
                    </View>
                  </View>

                  <View style={s.invoiceRight}>
                    <MoneyText amount={inv.amount} size="md" color={colors.text} />
                    <StatusPill label={status.label} tone={status.tone} size="sm" />
                  </View>
                </Pressable>
              )
            })
          )}
        </MCard>

        {/* Bottom spacer */}
        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

export default InvoiceListScreen

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */
const s = StyleSheet.create({
  skeleton: {
    padding: 16,
    gap: 14,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
  },

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listHeaderText: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  countBadge: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: colors.blueInk,
    backgroundColor: colors.blue100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },

  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  invoiceRowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  invoiceRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  invoiceInfo: {
    flex: 1,
    gap: 2,
  },
  invoiceService: {
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  invoiceProvider: {
    fontSize: 13,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  invoiceId: {
    fontSize: 11,
    fontFamily: fontWeights.medium,
    color: colors.textLight,
  },
  dotDot: {
    fontSize: 11,
    color: colors.textLight,
    marginHorizontal: 4,
  },
  invoiceDate: {
    fontSize: 11,
    fontFamily: fontWeights.regular,
    color: colors.textLight,
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },

  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 19,
  },
})

