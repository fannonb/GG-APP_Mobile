import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Pressable from '@/components/Pressable'
import Svg, { Path } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import { colors, fontWeights, radii, shadows } from '@/theme'
import { BankIcon, CheckIcon, HospitalIcon, InvoiceIcon, WalletIcon } from '@/icons'
import { Screen, ScrollArea, AppBar, MCard, MBtn, ActionBar } from '@/components'

/* ------------------------------------------------------------------ */
/*  Disclosure card data                                               */
/* ------------------------------------------------------------------ */
const DISCLOSURES = [
  {
    Icon: BankIcon,
    title: 'Third-Party Finance Partner',
    description:
      'Your healthcare credit facility is provided by a licensed and accredited finance partner, not by GG\'APP. GG\'APP acts as a facilitator only.',
  },
  {
    Icon: InvoiceIcon,
    title: 'Credit Check Consent',
    description:
      'The finance partner may perform a credit bureau enquiry as part of the application. This may temporarily affect your credit score.',
  },
  {
    Icon: HospitalIcon,
    title: 'Healthcare Use Only',
    description:
      'Funds can only be used to pay invoices from GG\'APP-verified healthcare providers. Credit cannot be transferred, cashed out, or used for non-medical purposes.',
  },
  {
    Icon: WalletIcon,
    title: 'Credit Obligation',
    description:
      'You are responsible for settling the credit according to the terms agreed with the finance partner, including any interest or fees.',
  },
  {
    Icon: CheckIcon,
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
          backgroundColor: checked ? colors.navy : colors.card,
          borderColor: checked ? colors.navy : colors.border,
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
                <item.Icon size={22} color={colors.blueInk} />
              </View>
              <View style={s.disclosureContent}>
                <Text style={s.disclosureTitle}>{item.title}</Text>
                <Text style={s.disclosureDesc}>{item.description}</Text>
              </View>
            </View>
          </MCard>
        ))}

        {/* Bottom spacer */}
        <View style={{ height: 8 }} />
      </ScrollArea>

      {/* The consent sits with the button it unlocks, so the reason "Continue"
          is disabled is always on screen. */}
      <ActionBar
        top={
          <Pressable
            style={[
              s.consentRow,
              {
                backgroundColor: agreed ? colors.blue100 : colors.bg,
                borderColor: agreed ? colors.navy : colors.border,
              },
            ]}
            onPress={() => setAgreed(!agreed)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            <CheckSquare checked={agreed} />
            <Text style={s.consentText}>
              I've read these disclosures and want to apply for healthcare credit.
            </Text>
          </Pressable>
        }
      >
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
          Continue
        </MBtn>
      </ActionBar>
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
})
