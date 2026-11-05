import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Pressable from '@/components/Pressable'
import { colors, fontWeights, radii } from '@/theme'
import { hapticSelection } from '@/lib/haptics'

interface PagerProps {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
  /**
   * 'page' (default): "1–10 of 12 · page 1 of 2".
   * 'showing': the web's wording, "Showing 1 to 10 of 12".
   */
  summary?: 'page' | 'showing'
}

/** Previous / Next controls under a paged list. Renders nothing when everything fits on one page. */
export default function Pager({ page, pageSize, total, onPage, summary = 'page' }: PagerProps) {
  if (total <= pageSize) return null
  const pages = Math.ceil(total / pageSize)
  const from = page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  const go = (next: number) => {
    hapticSelection()
    onPage(next)
  }

  const button = (label: string, disabled: boolean, target: number) => (
    <Pressable
      onPress={() => go(target)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label === 'Previous' ? 'Previous page' : 'Next page'}
      accessibilityState={{ disabled }}
      style={[styles.button, disabled && styles.buttonDisabled]}
    >
      <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>{label}</Text>
    </Pressable>
  )

  return (
    <View style={styles.wrap}>
      <Text style={styles.summary}>
        {summary === 'showing'
          ? `Showing ${from} to ${to} of ${total}`
          : `${from}–${to} of ${total} · page ${page + 1} of ${pages}`}
      </Text>
      <View style={styles.row}>
        {button('Previous', page === 0, page - 1)}
        {button('Next', page >= pages - 1, page + 1)}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 14, paddingBottom: 6, gap: 10, alignItems: 'center' },
  summary: { fontSize: 13, color: colors.textSub },
  row: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  button: {
    flex: 1,
    height: 44,
    borderRadius: radii.default,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
  buttonText: { fontSize: 14, fontFamily: fontWeights.semiBold, color: colors.text },
  buttonTextDisabled: { color: colors.textLight },
})
