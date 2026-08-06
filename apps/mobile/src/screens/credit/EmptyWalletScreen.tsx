import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Path, Circle, Line } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import { colors, fontWeights, radii, shadows } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn, GGPill } from '@/components'
import CreditIcon from '@/icons/CreditIcon'

/* ------------------------------------------------------------------ */
/*  Feature items for the apply card                                   */
/* ------------------------------------------------------------------ */
const FEATURES = [
  { emoji: '⚡', label: 'Instant',            desc: 'Funds loaded on approval' },
  { emoji: '🔒', label: 'Secure',             desc: 'Bank-grade encryption' },
  { emoji: '🏥', label: 'Verified providers',  desc: 'Approved network only' },
  { emoji: '👨‍👩‍👧', label: 'Family',   desc: 'Add beneficiaries' },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function EmptyWalletScreen() {
  const navigation = useNavigation<any>()

  return (
    <Screen>
      <AppBar title="Balance" subtitle="Manage your healthcare balance" />

      <ScrollArea gap={14} px={16} py={14}>
        {/* === 1. Placeholder Balance Card === */}
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>AVAILABLE BALANCE</Text>
          <Text style={s.balanceAmount}>Ksh.0.00</Text>

          {/* Empty progress bar */}
          <View style={s.progressTrack}>
            <View style={s.progressFill} />
          </View>

          {/* Warning pill */}
          <View style={s.warningPill}>
            <Text style={s.warningPillText}>No Active Credit</Text>
          </View>
        </View>

        {/* === 2. Apply for Healthcare Credit Card === */}
        <MCard padding={18}>
          <View style={s.applyHeader}>
            <View style={s.applyIconWrap}>
              <CreditIcon size={24} color={colors.blue} />
            </View>
            <View style={s.applyHeaderText}>
              <Text style={s.applyTitle}>Apply for Healthcare Credit</Text>
              <Text style={s.applyDesc}>
                Get approved for healthcare financing and access funds at verified providers.
              </Text>
            </View>
          </View>

          <View style={s.featureGrid}>
            {FEATURES.map(f => (
              <View key={f.label} style={s.featureItem}>
                <Text style={s.featureEmoji}>{f.emoji}</Text>
                <View>
                  <Text style={s.featureLabel}>{f.label}</Text>
                  <Text style={s.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <MBtn
            variant="primary"
            fullWidth
            onPress={() => navigation.navigate('CreditDisclaimer')}
          >
            {'Apply for Credit →'}
          </MBtn>
        </MCard>

        {/* === 3. Info Notice === */}
        <View style={s.infoNotice}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 } as any}>
            <Circle cx={8} cy={8} r={6.5} stroke={colors.blue} strokeWidth={1.3} />
            <Line x1={8} y1={5} x2={8} y2={9} stroke={colors.blue} strokeWidth={1.6} strokeLinecap="round" />
            <Circle cx={8} cy={11.5} r={0.9} fill={colors.blue} />
          </Svg>
          <Text style={s.infoText}>
            Healthcare credit is provided in partnership with finance accredited and verified finance partners.
            Funds can only be used with GG'APP-approved providers through the invoice flow.
          </Text>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

export default EmptyWalletScreen

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */
const s = StyleSheet.create({
  /* balance card (dark navy gradient) */
  balanceCard: {
    backgroundColor: colors.navy,
    borderRadius: radii.large,
    padding: 20,
    gap: 10,
    ...shadows.raised,
  },
  balanceLabel: {
    fontSize: 10,
    fontFamily: fontWeights.bold,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 34,
    fontFamily: fontWeights.extraBold,
    color: '#FFFFFF',
    letterSpacing: -1.2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    width: 0,
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.blue,
  },
  warningPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,166,35,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  warningPillText: {
    fontSize: 10,
    fontFamily: fontWeights.bold,
    color: colors.warning,
    letterSpacing: 0.3,
  },

  /* apply card */
  applyHeader: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  applyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.blue3,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  applyHeaderText: {
    flex: 1,
  },
  applyTitle: {
    fontSize: 16,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  applyDesc: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 18,
  },

  /* feature grid */
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '46%',
  },
  featureEmoji: {
    fontSize: 18,
  },
  featureLabel: {
    fontSize: 12,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  featureDesc: {
    fontSize: 10,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
  },

  /* info notice */
  infoNotice: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.blue3,
    borderRadius: radii.default,
    padding: 14,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.text,
    lineHeight: 18,
  },
})
