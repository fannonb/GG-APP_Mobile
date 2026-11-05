import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useUserStore } from '@gg/shared-stores'
import { getCountryByCode } from '@gg/shared-config'

/**
 * The customer's market flag, shown in the right-hand cluster of every signed-in
 * app bar (see AppHeader) so the market is always visible.
 */
export default function MarketFlag() {
  const countryCode = useUserStore(s => s.user?.countryCode) ?? 'KE'
  const country = getCountryByCode(countryCode)
  if (!country?.flag) return null
  return (
    <View style={styles.badge} accessible accessibilityRole="image" accessibilityLabel={`${country.name} market`}>
      <Text style={styles.flag}>{country.flag}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(9, 28, 68, 0.12)',
  },
  flag: {
    fontSize: 16,
  },
})
