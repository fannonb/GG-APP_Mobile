import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { colors } from '@/theme'
import { Screen, AppBar, EmptyIllustration } from '@/components'
import CreditIcon from '@/icons/CreditIcon'

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function EmptyCreditStatusScreen() {
  const navigation = useNavigation<any>()

  return (
    <Screen>
      <AppBar
        title="Application Status"
        subtitle="No active application"
        back={() => navigation.goBack()}
      />

      <View style={s.content}>
        <EmptyIllustration
          icon={<CreditIcon size={36} color={colors.blue} />}
          title="No Credit Application"
          subtitle="You haven't applied for healthcare credit yet. Apply to get instant access to medical financing at verified providers."
          cta={'Apply for Credit →'}
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
