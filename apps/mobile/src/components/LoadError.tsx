import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { colors, fontWeights } from '@/theme'
import MCard from './MCard'
import MBtn from './MBtn'

interface LoadErrorProps {
  /** What failed, in the patient's words, e.g. "We couldn't load your health ledger." */
  title: string
  /** Reassurance about what the failure does NOT mean. */
  body?: string
  onRetry: () => void
  retrying?: boolean
}

/**
 * Shown when a fetch fails, so a network error is never mistaken for
 * "you have no records" or "you haven't applied".
 */
export default function LoadError({ title, body, onRetry, retrying }: LoadErrorProps) {
  return (
    <MCard padding={20} style={styles.card}>
      <Text style={styles.title} accessibilityRole="alert">{title}</Text>
      <Text style={styles.body}>
        {body ?? 'Check your connection and try again.'}
      </Text>
      <MBtn variant="secondary" sm onPress={onRetry} disabled={retrying} style={styles.btn}>
        {retrying ? 'Trying again…' : 'Try again'}
      </MBtn>
    </MCard>
  )
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
  },
  title: {
    fontFamily: fontWeights.bold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSub,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 300,
  },
  btn: {
    marginTop: 14,
  },
})
