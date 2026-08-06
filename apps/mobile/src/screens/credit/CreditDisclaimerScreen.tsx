import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import { colors, fontWeights, radii, shadows } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn } from '@/components'

/* ------------------------------------------------------------------ */
/*  Disclosure card data                                               */
/* ------------------------------------------------------------------ */
const DISCLOSURES = [
  {
    emoji: '🏦',
    title: 'Third-Party Finance Partner',
    description:
      'Your healthcare credit facility is provided by a licensed and accredited finance partner, not by GG\'APP. GG\'APP acts as a facilitator only.',
  },
  {
    emoji: '📋',
    title: 'Credit Check Consent',
    description:
      'The finance partner may perform a credit bureau enquiry as part of the application. This may temporarily affect your credit score.',
  },
  {
    emoji: '🏥',
    title: 'Healthcare Use Only',
    description:
      'Funds can only be used to pay invoices from GG\'APP-verified healthcare providers. Credit cannot be transferred, cashed out, or used for non-medical purposes.',
  },
  {
    emoji: '💳',
    title: 'Credit Obligation',
    description:
      'You are responsible for settling the credit according to the terms agreed with the finance partner, including any interest or fees.',
  },
  {
    emoji: '✅',
    title: 'Eligibility',
    description:
      'Approval is subject to the finance partner\'s lending criteria. Submitting an application does not guarantee approval.',
  },
]

/* ------------------------------------------------------------------ */
/*  Check-square icon for consent                                      */
/* ------------------------------------------------------------------ */
function CheckSquare({ checked }: { checked: boolean }) {
  return (
    <View
      style={[
        s.checkBox,
        {
          backgroundColor: checked ? colors.success : colors.card,
          borderColor: checked ? colors.success : colors.border,
        },
      ]}
    >
      {checked && (
        <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
          <Path
            d="M2.5 6l2.5 2.5 4.5-4.5"
            stroke="#FFFFFF"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </View>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function CreditDisclaimerScreen() {
  const navigation = useNavigation<any>()
  const [agreed, setAgreed] = useState(false)

  return (
    <Screen>
      <AppBar
        title="Healthcare Credit"
        subtitle="Review before applying"
        back
      />

      <ScrollArea gap={14} px={16} py={14}>
        {/* ============================================================ */}
        {/*  Disclosure Cards                                            */}
        {/* ============================================================ */}
        {DISCLOSURES.map((item, idx) => (
          <MCard key={idx} padding={16}>
            <View style={s.disclosureRow}>
              <View style={s.iconCircle}>
                <Text style={s.iconEmoji}>{item.emoji}</Text>
              </View>
              <View style={s.disclosureContent}>
                <Text style={s.disclosureTitle}>{item.title}</Text>
                <Text style={s.disclosureDesc}>{item.description}</Text>
              </View>
            </View>
          </MCard>
        ))}

        {/* ============================================================ */}
        {/*  Consent Checkbox                                            */}
        {/* ============================================================ */}
        <Pressable
          style={[
            s.consentRow,
            {
              backgroundColor: agreed ? colors.successBg : colors.bg,
              borderColor: agreed ? colors.success : colors.border,
            },
          ]}
          onPress={() => setAgreed(!agreed)}
        >
          <CheckSquare checked={agreed} />
          <Text style={s.consentText}>
            I have read and understood the above disclosures and wish to proceed
            with my healthcare credit application.
          </Text>
        </Pressable>

        {/* ============================================================ */}
        {/*  Action Buttons                                              */}
        {/* ============================================================ */}
        <View style={s.btnRow}>
          <MBtn
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => navigation.goBack()}
          >
            Cancel
          </MBtn>
          <MBtn
            variant="primary"
            style={{ flex: 2 }}
            disabled={!agreed}
            onPress={() => navigation.navigate('CreditInitialApply')}
          >
            {'Proceed to Application →'}
          </MBtn>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

export default CreditDisclaimerScreen

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */
const s = StyleSheet.create({
  /* disclosure card layout */
  disclosureRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue3,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconEmoji: {
    fontSize: 18,
  },
  disclosureContent: {
    flex: 1,
  },
  disclosureTitle: {
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  disclosureDesc: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 21,
  },

  /* consent */
  consentRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: radii.default,
    borderWidth: 1.5,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.text,
    lineHeight: 19,
  },

  /* buttons */
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
})
