import { Text, View, StyleSheet } from 'react-native'
import { useConnectionStore } from '@/lib/connection'
import { colors, fontWeights } from '@/theme'

export function OfflineBanner() {
  const reachable = useConnectionStore(s => s.reachable)
  const savedAt = useConnectionStore(s => s.savedAt)
  if (reachable !== false) return null
  return (
    <View style={s.banner} accessibilityRole="alert">
      <Text style={s.text}>
        {savedAt ? `Can't connect · Showing saved data from ${new Date(savedAt).toLocaleString()}. Reconnect to submit changes.`
          : "Can't connect. Reconnect to load your data or submit changes."}
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  banner: { backgroundColor: colors.warningBg, paddingVertical: 8, paddingHorizontal: 16 },
  text: { color: colors.warning, fontFamily: fontWeights.medium, fontSize: 13, lineHeight: 18, textAlign: 'center' },
})
