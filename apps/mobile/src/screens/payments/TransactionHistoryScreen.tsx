import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, GGPill, FilterChips } from '@/components'
import { usePatientTransactions } from '@gg/shared-hooks'
import { formatCurrency, formatDate } from '@gg/shared-utils'
import type { Transaction } from '@gg/shared-types'

/* ---------- Summary Card ---------- */

function SummaryCard({
  label,
  amount,
  accentColor,
}: {
  label: string
  amount: string
  accentColor: string
}) {
  return (
    <MCard style={summaryStyles.card} padding={14}>
      <Text style={summaryStyles.label}>{label}</Text>
      <Text style={[summaryStyles.amount, { color: accentColor }]}>
        {amount}
      </Text>
    </MCard>
  )
}

const summaryStyles = StyleSheet.create({
  card: {
    flex: 1,
  },
  label: {
    fontFamily: fontWeights.bold,
    fontSize: 10,
    color: colors.textSub,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  amount: {
    fontFamily: fontWeights.extraBold,
    fontSize: 20,
    letterSpacing: -0.6,
  },
})

/* ---------- Transaction Row ---------- */

function TransactionRow({ txn }: { txn: Transaction }) {
  const statusMap: Record<string, { label: string; type: 'success' | 'info' | 'pending' | 'error' }> = {
    completed:  { label: 'Paid', type: 'success' },
    authorized: { label: 'Authorized', type: 'info' },
    pending:    { label: 'Pending', type: 'pending' },
    failed:     { label: 'Failed', type: 'error' },
  }
  const meta = statusMap[txn.status] ?? statusMap.failed

  return (
    <View style={rowStyles.container}>
      <View style={rowStyles.left}>
        <Text style={rowStyles.refText} numberOfLines={1}>
          {txn.id ?? '---'}
        </Text>
        <Text style={rowStyles.providerText} numberOfLines={1}>
          {txn.provider ?? 'Unknown Provider'}
        </Text>
        <Text style={rowStyles.serviceText} numberOfLines={1}>
          {txn.service ?? 'Service'} {'·'} {formatDate(txn.date)}
        </Text>
      </View>
      <View style={rowStyles.right}>
        <Text style={rowStyles.amountText}>
          -{formatCurrency(txn.amount ?? 0)}
        </Text>
        <GGPill type={meta.type}>{meta.label}</GGPill>
      </View>
    </View>
  )
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    flex: 1,
    marginRight: 12,
  },
  refText: {
    fontFamily: fontWeights.semiBold,
    fontSize: 13,
    color: colors.blue,
    marginBottom: 2,
  },
  providerText: {
    fontFamily: fontWeights.medium,
    fontSize: 13,
    color: colors.text,
    marginBottom: 2,
  },
  serviceText: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.textSub,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountText: {
    fontFamily: fontWeights.extraBold,
    fontSize: 14,
    color: colors.text,
  },
})

/* ---------- Table Header ---------- */

function TableHeader() {
  return (
    <View style={tableStyles.header}>
      <Text style={[tableStyles.headerCell, { flex: 1 }]}>REFERENCE</Text>
      <Text style={[tableStyles.headerCell, { flex: 1 }]}>PROVIDER</Text>
      <Text style={[tableStyles.headerCell, { textAlign: 'right' }]}>AMOUNT</Text>
    </View>
  )
}

const tableStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    fontFamily: fontWeights.bold,
    fontSize: 10,
    color: colors.textSub,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})

/* ---------- Filter Options ---------- */

const FILTER_ITEMS = [
  { label: 'All Time' },
  { label: 'This Month' },
  { label: 'Last Month' },
]

/* ---------- Main Screen ---------- */

export function TransactionHistoryScreen() {
  const { data: transactions = [], isLoading } = usePatientTransactions()
  const [filterIndex, setFilterIndex] = useState(0)

  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  /* Filtered list */
  const filteredTransactions = useMemo(() => {
    if (filterIndex === 1) {
      return transactions.filter((txn: Transaction) => {
        const d = new Date(txn.date)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
    }
    if (filterIndex === 2) {
      return transactions.filter((txn: Transaction) => {
        const d = new Date(txn.date)
        return d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth()
      })
    }
    return transactions
  }, [filterIndex, transactions, now.getFullYear(), now.getMonth()])

  /* Summary totals */
  const spendable = transactions.filter((t: Transaction) => t.status !== 'failed')
  const totalSpent = spendable.reduce((s: number, t: Transaction) => s + (t.amount ?? 0), 0)
  const thisMonthTotal = spendable
    .filter((t: Transaction) => {
      const d = new Date(t.date)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    .reduce((s: number, t: Transaction) => s + (t.amount ?? 0), 0)

  return (
    <Screen bg={colors.bg}>
      <AppBar
        title="Transaction History"
        subtitle="All balance-funded healthcare payments"
      />
      <ScrollArea gap={16} px={16}>
        {/* Summary */}
        <View style={s.summaryRow}>
          <SummaryCard
            label="Total Spent"
            amount={formatCurrency(totalSpent)}
            accentColor={colors.text}
          />
          <SummaryCard
            label="This Month"
            amount={formatCurrency(thisMonthTotal)}
            accentColor={colors.blue}
          />
        </View>

        {/* Filter Chips */}
        <FilterChips
          items={FILTER_ITEMS}
          activeIndex={filterIndex}
          onSelect={setFilterIndex}
        />

        {/* Transaction Table */}
        <MCard padding={0} style={s.tableCard}>
          <TableHeader />

          {isLoading ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="small" color={colors.blue} />
              <Text style={s.loadingText}>Loading transactions...</Text>
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View style={s.emptyContainer}>
              <Text style={s.emptyTitle}>No transactions yet</Text>
              <Text style={s.emptySubtitle}>
                {transactions.length === 0
                  ? "Payments made through GG'APP will appear here."
                  : 'No transactions found for this filter.'}
              </Text>
            </View>
          ) : (
            filteredTransactions.map((txn: Transaction) => (
              <TransactionRow key={txn.id} txn={txn} />
            ))
          )}
        </MCard>
      </ScrollArea>
    </Screen>
  )
}

const s = StyleSheet.create({
  /* Summary */
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },

  /* Table card */
  tableCard: {
    overflow: 'hidden',
  },

  /* Loading */
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    fontFamily: fontWeights.medium,
    fontSize: 13,
    color: colors.textSub,
  },

  /* Empty */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontFamily: fontWeights.semiBold,
    fontSize: 14,
    color: colors.textSub,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
  },
})

export default TransactionHistoryScreen
