import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Pressable from '@/components/Pressable'
import MCard from '@/components/MCard'
import { colors, fontWeights, radii } from '@/theme'
import { formatCurrency } from '@gg/shared-utils'
import {
  daysUntilDue,
  repaymentDueLabel,
  type InstallmentStatus,
  type RepaymentPlan,
} from '@/lib/repayment-preview'

/** Same tag as the PWA: marks the placeholder schedule as not real data. */
export function SampleDataTag() {
  return (
    <View style={styles.sampleTag} accessibilityLabel="Sample data">
      <Text style={styles.sampleTagText}>Sample data</Text>
    </View>
  )
}

const shortDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const longDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const STATUS_STYLE: Record<InstallmentStatus, { label: string; ink: string; bg: string }> = {
  paid: { label: 'Paid', ink: colors.success, bg: colors.successBg },
  due: { label: 'Next due', ink: colors.warning, bg: colors.warningBg },
  upcoming: { label: 'Upcoming', ink: colors.textSub, bg: colors.surfaceMuted },
}

/** Summary of the placeholder schedule with a toggle for the full list. */
export function RepaymentCard({
  plan,
  currency,
  scheduleOpen,
  onToggleSchedule,
}: {
  plan: RepaymentPlan
  currency: string
  scheduleOpen: boolean
  onToggleSchedule: () => void
}) {
  const next = plan.next
  const pct = Math.round((plan.paidCount / plan.termMonths) * 100)
  const soon = next ? daysUntilDue(next.dueDate) <= 7 : false

  return (
    <MCard padding={18}>
      <View style={styles.header}>
        <Text style={styles.title}>Repayments</Text>
        <SampleDataTag />
      </View>

      {next ? (
        <View style={styles.block}>
          <Text style={styles.label}>Next payment</Text>
          <Text style={styles.amount}>{formatCurrency(next.total, currency)}</Text>
          <View style={[styles.duePill, { backgroundColor: soon ? colors.warningBg : colors.blue100 }]}>
            <Text style={[styles.duePillText, { color: soon ? colors.warning : colors.blueInk }]}>
              {repaymentDueLabel(next.dueDate)}
            </Text>
          </View>
          <Text style={styles.sub}>
            {longDate(next.dueDate)} · {formatCurrency(next.principal, currency)} + {formatCurrency(next.interest, currency)} interest
          </Text>
        </View>
      ) : (
        <Text style={styles.allMade}>All repayments made</Text>
      )}

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityLabel="Repayments made"
        accessibilityValue={{ min: 0, max: plan.termMonths, now: plan.paidCount }}
      >
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.sub}>
          <Text style={styles.strong}>{plan.paidCount} of {plan.termMonths}</Text> paid
        </Text>
        <Text style={styles.sub}>
          Still owed <Text style={styles.strong}>{formatCurrency(plan.outstanding, currency)}</Text>
        </Text>
      </View>

      <Pressable
        onPress={onToggleSchedule}
        accessibilityRole="button"
        accessibilityState={{ expanded: scheduleOpen }}
        style={styles.toggle}
      >
        <Text style={styles.toggleText}>{scheduleOpen ? 'Hide schedule' : 'View full schedule'}</Text>
      </Pressable>
    </MCard>
  )
}

/** The full placeholder schedule, one row per installment. */
export function RepaymentSchedule({ plan, currency }: { plan: RepaymentPlan; currency: string }) {
  const principalTotal = plan.installments.reduce((sum, inst) => sum + inst.principal, 0)

  return (
    <MCard padding={16}>
      <View style={styles.header}>
        <Text style={styles.title}>Repayment schedule</Text>
        <SampleDataTag />
      </View>
      <Text style={styles.sub}>
        {plan.termMonths} monthly payments · {plan.monthlyRatePct}% interest per month
      </Text>
      <View style={styles.totals}>
        <View style={styles.totalBlock}>
          <Text style={styles.label}>Borrowed</Text>
          <Text style={styles.totalValue}>{formatCurrency(principalTotal, currency)}</Text>
        </View>
        <View style={styles.totalBlock}>
          <Text style={styles.label}>Total interest</Text>
          <Text style={styles.totalValue}>{formatCurrency(plan.interestTotal, currency)}</Text>
        </View>
        <View style={styles.totalBlock}>
          <Text style={styles.label}>Total to repay</Text>
          <Text style={styles.totalValue}>{formatCurrency(principalTotal + plan.interestTotal, currency)}</Text>
        </View>
      </View>

      {plan.installments.map(inst => {
        const st = STATUS_STYLE[inst.status]
        const muted = inst.status === 'paid'
        const highlight = inst.status === 'due'
        return (
          <View key={inst.n} style={[styles.row, highlight && styles.rowHighlight]}>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, muted && styles.mutedText]}>
                {shortDate(inst.dueDate)} · Payment {inst.n}
              </Text>
              <Text style={styles.sub}>
                {formatCurrency(inst.principal, currency)} + {formatCurrency(inst.interest, currency)} interest
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowTitle, muted && styles.mutedText]}>{formatCurrency(inst.total, currency)}</Text>
              <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                <Text style={[styles.statusPillText, { color: st.ink }]}>{st.label}</Text>
              </View>
            </View>
          </View>
        )
      })}

      <Text style={styles.footnote}>
        Payments are collected by your finance partner. Contact them if you need to change a payment date.
      </Text>
    </MCard>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { fontSize: 16, fontFamily: fontWeights.extraBold, color: colors.text },
  block: { gap: 4, marginTop: 14 },
  label: { fontSize: 13, fontFamily: fontWeights.semiBold, color: colors.textSub },
  amount: { fontSize: 26, fontFamily: fontWeights.extraBold, color: colors.text, letterSpacing: -0.6 },
  duePill: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: radii.full, marginTop: 2 },
  duePillText: { fontSize: 12, fontFamily: fontWeights.bold },
  sub: { fontSize: 13, fontFamily: fontWeights.regular, color: colors.textSub, marginTop: 2 },
  strong: { fontFamily: fontWeights.bold, color: colors.text },
  allMade: { marginTop: 14, fontSize: 17, fontFamily: fontWeights.extraBold, color: colors.success },
  track: { marginTop: 16, height: 8, borderRadius: radii.full, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.full, backgroundColor: colors.success },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  toggle: {
    marginTop: 16,
    height: 42,
    borderRadius: radii.default,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: { fontSize: 14, fontFamily: fontWeights.bold, color: colors.blueInk },
  sampleTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full, backgroundColor: colors.purpleBg },
  sampleTagText: { fontSize: 10, fontFamily: fontWeights.extraBold, color: colors.purple, textTransform: 'uppercase' },
  totals: { flexDirection: 'row', gap: 12, marginTop: 14, marginBottom: 8 },
  totalBlock: { flex: 1, gap: 2 },
  totalValue: { fontSize: 14, fontFamily: fontWeights.bold, color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowHighlight: { backgroundColor: colors.warningBg, borderRadius: radii.default, paddingHorizontal: 8 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontFamily: fontWeights.bold, color: colors.text },
  mutedText: { color: colors.textSub },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radii.full },
  statusPillText: { fontSize: 11, fontFamily: fontWeights.bold },
  footnote: { marginTop: 12, fontSize: 12, fontFamily: fontWeights.regular, color: colors.textLight, lineHeight: 17 },
})
