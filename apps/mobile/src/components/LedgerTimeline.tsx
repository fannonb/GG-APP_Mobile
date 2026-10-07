import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, TextInput } from 'react-native'
import Pressable from '@/components/Pressable'
import { animateNextLayout } from '@/lib/motion'
import Svg, { Path, Circle } from 'react-native-svg'
import type { LedgerEntry } from '@gg/shared-types'
import { colors, fontWeights, radii, shadows } from '@/theme'
import { MCard, GGPill } from '@/components'

function entryKey(entry: LedgerEntry) {
  return `${entry.kind}-${entry.id}`
}

function formatDateHeader(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const dateStr = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${dateStr} at ${timeStr}`
}

function categoryLabel(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
}

const VITAL_LABELS: Record<string, string> = {
  bp: 'Blood Pressure',
  temp: 'Temperature',
  weight: 'Weight',
  sats: 'O₂ Sats',
  glucose: 'Glucometer',
  pulse: 'Pulse',
  height: 'Height',
  bmi: 'BMI',
}

function VisitIcon({ color = colors.blue }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.8 2.3A.3.3 0 0 0 4.5 2.6V11a6 6 0 0 0 12 0V2.6a.3.3 0 0 0-.3-.3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10.5 17a6 6 0 0 0 6 6h1.5a4.5 4.5 0 0 0 4.5-4.5v-3.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={22.5} cy={15} r={1.5} fill={color} />
    </Svg>
  )
}

function PrescriptionIcon({ color = colors.blue }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="m8.5 8.5 7 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ChevronDownIcon({
  color = colors.textSub,
  expanded = false,
}: {
  color?: string
  expanded?: boolean
}) {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
    >
      <Path
        d="m6 9 6 6 6-6"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** "1 item", "3 items". */
function countLabel(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}

function VitalChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.vitalChip}>
      <Text style={styles.vitalLabel}>{label}</Text>
      <Text style={styles.vitalValue}>{value}</Text>
    </View>
  )
}

function DetailField({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <View style={[styles.detailField, highlight && styles.detailFieldHighlight]}>
      <Text style={[styles.fieldLabel, highlight && styles.fieldLabelHighlight]}>{label}</Text>
      <Text style={[styles.fieldValue, highlight && styles.fieldValueHighlight]}>{value}</Text>
    </View>
  )
}

function VisitCardContent({ entry }: { entry: Extract<LedgerEntry, { kind: 'visit' }> }) {
  const vitals = Object.entries(entry.vitals).filter(([, value]) => value)

  return (
    <View style={styles.entryBody}>
      {entry.beneficiaryName ? <GGPill type="info">For: {entry.beneficiaryName}</GGPill> : null}

      {vitals.length > 0 ? (
        <View>
          <Text style={styles.fieldLabel}>Vitals Recorded</Text>
          <View style={styles.vitalRow}>
            {vitals.map(([key, value]) => (
              <VitalChip key={key} label={VITAL_LABELS[key] ?? key} value={value} />
            ))}
          </View>
        </View>
      ) : null}

      {entry.diagnosis ? <DetailField label="Diagnosis" value={entry.diagnosis} highlight /> : null}
      {entry.treatment ? <DetailField label="Treatment" value={entry.treatment} /> : null}

      {entry.services.length > 0 ? (
        <View>
          <Text style={styles.fieldLabel}>Services</Text>
          <View style={styles.pillRow}>
            {entry.services.map(service => (
              <GGPill key={service} type="default">
                {service}
              </GGPill>
            ))}
          </View>
        </View>
      ) : null}

      {entry.followUp ? <DetailField label="Follow-up" value={entry.followUp} /> : null}
    </View>
  )
}

function PrescriptionCardContent({
  entry,
}: {
  entry: Extract<LedgerEntry, { kind: 'prescription' }>
}) {
  return (
    <View style={styles.entryBody}>
      <View style={styles.rxMetaRow}>
        <View style={styles.pillRow}>
          {entry.beneficiaryName ? <GGPill type="info">For: {entry.beneficiaryName}</GGPill> : null}
        </View>
        <Text style={styles.refText}>
          Ref: <Text style={styles.refValue}>{entry.reference}</Text>
        </Text>
      </View>

      <View>
        <Text style={styles.fieldLabel}>Medication Dispensed ({entry.items.length})</Text>
        <View style={styles.medList}>
          {entry.items.map((item, index) => (
            <View key={`${item.name}-${index}`} style={styles.medRow}>
              <View style={styles.medLeft}>
                <View style={styles.medDot} />
                <Text style={styles.medName}>{item.name}</Text>
              </View>
              {item.quantity ? <Text style={styles.medQty}>{item.quantity}</Text> : null}
            </View>
          ))}
          {entry.items.length === 0 ? (
            <Text style={styles.emptyText}>Prescription fulfilled ({entry.reference})</Text>
          ) : null}
        </View>
      </View>
    </View>
  )
}

function CollapsibleEntryCard({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: LedgerEntry
  isExpanded: boolean
  onToggle: () => void
}) {
  const isVisit = entry.kind === 'visit'
  const vitalsCount = isVisit ? Object.values(entry.vitals).filter(Boolean).length : 0

  return (
    <View style={[styles.card, isExpanded ? styles.cardExpanded : styles.cardCollapsed]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={isExpanded ? 'Collapse details' : 'Expand details'}
        style={[styles.header, isExpanded && styles.headerExpanded]}
      >
        <View style={styles.headerMain}>
          <View style={styles.iconBadge}>
            {isVisit ? <VisitIcon /> : <PrescriptionIcon />}
          </View>

          <View style={styles.headerInfo}>
            <View style={styles.dateRow}>
              <Text style={styles.dateHeading}>{formatDateHeader(entry.date)}</Text>
              {entry.beneficiaryName ? (
                <GGPill type="info">For: {entry.beneficiaryName}</GGPill>
              ) : null}
            </View>

            {/* Plain text lines: the old pill-and-dot row wrapped and left stray "•" separators. */}
            <Text style={styles.providerName} numberOfLines={1}>{entry.provider.name}</Text>
            <Text style={styles.metaText} numberOfLines={1}>
              {[categoryLabel(entry.provider.category), isVisit ? entry.service ?? 'Medical visit' : 'Prescription']
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.summaryText}>
            {(isVisit
              ? [
                  vitalsCount > 0 ? countLabel(vitalsCount, 'vital') : null,
                  entry.services.length > 0 ? countLabel(entry.services.length, 'service') : null,
                ]
              : [
                  entry.fulfillmentMode === 'DELIVERY' ? 'Delivered' : 'Collected',
                  countLabel(entry.items.length, 'item'),
                ]
            )
              .filter(Boolean)
              .join(' · ')}
          </Text>

          <View
            style={[
              styles.chevronBtn,
              isExpanded ? styles.chevronBtnExpanded : styles.chevronBtnCollapsed,
            ]}
          >
            <ChevronDownIcon
              expanded={isExpanded}
              color={isExpanded ? colors.blue : colors.textSub}
            />
          </View>
        </View>
      </Pressable>

      {isExpanded ? (
        <View style={styles.expandedBody}>
          <View style={styles.divider} />
          {isVisit ? (
            <VisitCardContent entry={entry} />
          ) : (
            <PrescriptionCardContent entry={entry} />
          )}
        </View>
      ) : null}
    </View>
  )
}

export function LedgerTimeline({
  entries,
  emptyMessage,
}: {
  entries: LedgerEntry[]
  emptyMessage?: string
}) {
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | 'visit' | 'prescription'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | '30d' | '6m' | '12m'>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const cutoff = dateFilter === 'all'
      ? null
      : Date.now() - (dateFilter === '30d' ? 30 : dateFilter === '6m' ? 182 : 365) * 24 * 60 * 60 * 1000
    return entries.filter(entry => {
      if (kindFilter !== 'all' && entry.kind !== kindFilter) return false
      if (cutoff && new Date(entry.date).getTime() < cutoff) return false
      if (!q) return true
      const blob = [
        entry.kind,
        entry.provider?.name,
        'diagnosis' in entry ? entry.diagnosis : '',
        'service' in entry ? entry.service : '',
        'items' in entry ? entry.items.map(i => i.name).join(' ') : '',
        'services' in entry ? entry.services.join(' ') : '',
      ].join(' ').toLowerCase()
      return blob.includes(q)
    })
  }, [entries, query, kindFilter, dateFilter])

  const hasActiveFilters = Boolean(query.trim()) || kindFilter !== 'all' || dateFilter !== 'all'

  const allIds = useMemo(() => filtered.map(entryKey), [filtered])
  const entriesFingerprint = allIds.join('|')

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (entries.length > 0) initial.add(entryKey(entries[0]))
    return initial
  })

  useEffect(() => {
    setExpandedIds(prev => {
      const next = new Set<string>()
      for (const id of allIds) {
        if (prev.has(id)) next.add(id)
      }
      if (next.size === 0 && allIds[0]) next.add(allIds[0])
      return next
    })
  }, [entriesFingerprint, allIds])

  if (entries.length === 0) {
    return (
      <MCard padding={24}>
        <Text style={styles.emptyCenter}>
          {emptyMessage ?? 'No treatment history recorded yet.'}
        </Text>
      </MCard>
    )
  }

  const allExpanded = allIds.length > 0 && allIds.every(id => expandedIds.has(id))

  const toggleExpand = (id: string) => {
    animateNextLayout()
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    animateNextLayout()
    setExpandedIds(allExpanded ? new Set() : new Set(allIds))
  }

  return (
    <View style={styles.timeline}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search provider, diagnosis, or items"
        placeholderTextColor={colors.textLight}
      />
      <View style={styles.filterRow}>
        {([
          ['all', 'All'],
          ['visit', 'Visits'],
          ['prescription', 'Prescriptions'],
        ] as const).map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setKindFilter(id)}
            style={[styles.chip, kindFilter === id && styles.chipActive]}
          >
            <Text style={[styles.chipText, kindFilter === id && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.filterRow}>
        {([
          ['30d', 'Last 30 days'],
          ['6m', 'Last 6 months'],
          ['12m', 'Last 12 months'],
        ] as const).map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setDateFilter(prev => (prev === id ? 'all' : id))}
            style={[styles.chip, dateFilter === id && styles.chipActive]}
          >
            <Text style={[styles.chipText, dateFilter === id && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        ))}
        {hasActiveFilters && (
          <Pressable onPress={() => { setQuery(''); setKindFilter('all'); setDateFilter('all') }}>
            <Text style={styles.clearFilters}>Clear</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.controls}>
        <Text style={styles.recordCount}>
          {filtered.length} {filtered.length === 1 ? 'treatment record' : 'treatment records'}
        </Text>
        <Pressable onPress={toggleAll} hitSlop={8} accessibilityRole="button">
          <Text style={styles.toggleAll}>{allExpanded ? 'Collapse all' : 'Expand all'}</Text>
        </Pressable>
      </View>

      {filtered.length === 0 ? (
        <MCard padding={24}>
          <Text style={styles.emptyCenter}>No records match these filters.</Text>
        </MCard>
      ) : (
        filtered.map(entry => {
          const idKey = entryKey(entry)
          return (
            <CollapsibleEntryCard
              key={idKey}
              entry={entry}
              isExpanded={expandedIds.has(idKey)}
              onToggle={() => toggleExpand(idKey)}
            />
          )
        })
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  timeline: {
    gap: 14,
  },
  search: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fontWeights.regular,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.card,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipText: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: colors.textSub,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  clearFilters: {
    fontSize: 12,
    fontFamily: fontWeights.bold,
    color: colors.blueInk,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  recordCount: {
    fontFamily: fontWeights.semiBold,
    fontSize: 13,
    color: colors.textSub,
  },
  toggleAll: {
    fontFamily: fontWeights.bold,
    fontSize: 12.5,
    color: colors.blueInk,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.large,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  cardCollapsed: {
    borderColor: colors.border,
    ...shadows.card,
  },
  cardExpanded: {
    borderColor: colors.blue400,
    ...shadows.raised,
  },
  header: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  headerExpanded: {
    backgroundColor: 'rgba(56, 182, 255, 0.03)',
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: radii.default,
    backgroundColor: colors.blue100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  dateHeading: {
    fontFamily: fontWeights.bold,
    fontSize: 15,
    color: colors.navy,
  },
  providerName: {
    fontFamily: fontWeights.semiBold,
    fontSize: 14,
    color: colors.text,
    marginTop: 2,
  },
  metaText: {
    fontFamily: fontWeights.regular,
    fontSize: 12.5,
    color: colors.textSub,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginLeft: 54,
  },
  summaryText: {
    flex: 1,
    fontFamily: fontWeights.medium,
    fontSize: 13,
    color: colors.textSub,
  },
  chevronBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronBtnCollapsed: {
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chevronBtnExpanded: {
    borderColor: colors.blue,
    backgroundColor: colors.blue100,
  },
  expandedBody: {
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  entryBody: {
    gap: 12,
  },
  vitalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  vitalChip: {
    paddingVertical: 4,
    minWidth: 120,
    flexGrow: 1,
    flexBasis: 130,
  },
  vitalLabel: {
    fontFamily: fontWeights.semiBold,
    fontSize: 11,
    color: colors.textSub,
  },
  vitalValue: {
    fontFamily: fontWeights.bold,
    fontSize: 15,
    color: colors.navy,
    marginTop: 2,
  },
  detailField: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailFieldHighlight: {},
  fieldLabel: {
    fontFamily: fontWeights.bold,
    fontSize: 12,
    color: colors.textSub,
    marginBottom: 4,
  },
  fieldLabelHighlight: {
    color: colors.navy,
  },
  fieldValue: {
    fontFamily: fontWeights.regular,
    fontSize: 13.5,
    color: colors.text,
    lineHeight: 20,
  },
  fieldValueHighlight: {
    fontFamily: fontWeights.bold,
    fontSize: 15,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rxMetaRow: {
    gap: 8,
  },
  refText: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.textSub,
  },
  refValue: {
    fontFamily: fontWeights.semiBold,
    color: colors.navy,
  },
  medList: {
    gap: 6,
    marginTop: 6,
  },
  medRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  medLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  medDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.blue,
  },
  medName: {
    fontFamily: fontWeights.semiBold,
    fontSize: 13.5,
    color: colors.text,
    flex: 1,
  },
  medQty: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    color: colors.textSub,
  },
  emptyText: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    color: colors.textSub,
  },
  emptyCenter: {
    fontFamily: fontWeights.regular,
    fontSize: 14,
    color: colors.textSub,
    textAlign: 'center',
  },
})
