import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { colors } from '@/theme'
import { Screen, PageTitle, EmptyIllustration } from '@/components'
import CreditIcon from '@/icons/CreditIcon'

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function EmptyCreditStatusScreen() {
  const navigation = useNavigation<any>()

  return (
    <Screen header="detail">
      <View style={s.titleWrap}>
        <PageTitle title="Application Status" subtitle="No active application" />
      </View>

      <View style={s.content}>
        <EmptyIllustration
          icon={<CreditIcon size={36} color={colors.blue} />}
          title="No Allocation Application"
          subtitle="You haven't applied for a healthcare allocation yet. Apply to get instant access to medical financing at verified providers."
          cta={'Apply for an Allocation →'}
          onCta={() => navigation.navigate('CreditInitialApply')}
        />
      </View>
    </Screen>
  )
}

export default EmptyCreditStatusScreen

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */
const s = StyleSheet.create({
  titleWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
