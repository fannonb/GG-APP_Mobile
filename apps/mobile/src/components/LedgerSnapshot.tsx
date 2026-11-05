import { Text, View, StyleSheet } from 'react-native'
import type { LedgerEntry } from '@gg/shared-types'
import { ledgerSnapshot } from '@/lib/patient-parity'
import { colors, fontWeights } from '@/theme'
import MCard from './MCard'

const LABELS: Record<string, string> = {
  bp: 'Blood pressure', temp: 'Temperature', weight: 'Weight', sats: 'O₂ saturation',
  glucose: 'Blood glucose', pulse: 'Pulse', height: 'Height', bmi: 'BMI',
}

export function LedgerSnapshot({ entries }: { entries: LedgerEntry[] }) {
  const { vitals, medicines } = ledgerSnapshot(entries)
  if (!vitals && medicines.length === 0) return null
  return (
    <MCard padding={16}>
      <Text style={s.title}>Your health summary</Text>
      {vitals && (
        <View style={s.section}>
          <Text style={s.label}>Latest vitals · {new Date(vitals.date).toLocaleDateString()}</Text>
          <Text style={s.note}>{vitals.provider.name}</Text>
          {Object.entries(vitals.vitals).filter(([, value]) => value).map(([key, value]) => (
            <View key={key} style={s.row}>
              <Text style={s.label}>{LABELS[key] ?? key}</Text>
              <Text style={s.value}>{value}</Text>
            </View>
          ))}
        </View>
      )}
      {medicines.length > 0 && (
        <View style={s.section}>
          <Text style={s.label}>Recent medicines · Last 90 days</Text>
          <Text style={s.value}>{medicines.join(', ')}</Text>
        </View>
      )}
    </MCard>
  )
}

const s = StyleSheet.create({
  title: { fontFamily: fontWeights.bold, fontSize: 17, color: colors.navy },
  section: { marginTop: 14, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  label: { fontFamily: fontWeights.regular, fontSize: 14, color: colors.textSub },
  note: { fontFamily: fontWeights.regular, fontSize: 13, color: colors.textLight },
  value: { fontFamily: fontWeights.semiBold, fontSize: 15, color: colors.text, flexShrink: 1 },
})
