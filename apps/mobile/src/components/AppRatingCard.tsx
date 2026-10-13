import React, { useState } from 'react'
import { View, Text, StyleSheet, TextInput } from 'react-native'
import Pressable from '@/components/Pressable'
import { apiClient, getIsMockApi } from '@gg/shared-api'
import { colors, fontWeights, radii } from '@/theme'
import MCard from './MCard'
import MBtn from './MBtn'

const LABELS = ['', 'Very poor', 'Poor', 'Okay', 'Good', 'Excellent']

/**
 * A quick rating of GG'APP itself (not the provider), shown after paying.
 * Feeds the "App satisfaction" card in the admin insights.
 */
export function AppRatingCard() {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'dismissed'>('idle')
  const [error, setError] = useState<string | null>(null)

  if (state === 'dismissed') return null

  if (state === 'sent') {
    return (
      <MCard padding={16}>
        <Text style={s.title}>Thanks for rating GG’APP</Text>
        <Text style={s.sub}>Your feedback helps us improve the app.</Text>
      </MCard>
    )
  }

  const send = async () => {
    setState('sending')
    setError(null)
    try {
      if (!getIsMockApi()) {
        await apiClient.post('/feedback', { rating, comment: comment.trim() || undefined, context: 'payment', platform: 'mobile' })
      }
      setState('sent')
    } catch {
      setError('We couldn’t send that. Please try again.')
      setState('idle')
    }
  }

  return (
    <MCard padding={16}>
      <Text style={s.title}>How easy was it to pay with GG’APP?</Text>
      <Text style={s.sub}>Rate the app itself, not the provider.</Text>

      <View style={s.stars} accessibilityRole="radiogroup">
        {[1, 2, 3, 4, 5].map(n => (
          <Pressable
            key={n}
            onPress={() => setRating(n)}
            accessibilityRole="radio"
            accessibilityState={{ selected: rating === n }}
            accessibilityLabel={`${n} star${n === 1 ? '' : 's'}: ${LABELS[n]}`}
            hitSlop={6}
          >
            <Text style={[s.star, n <= rating && s.starOn]}>★</Text>
          </Pressable>
        ))}
        {rating > 0 ? <Text style={s.starLabel}>{LABELS[rating]}</Text> : null}
      </View>

      {rating > 0 ? (
        <TextInput
          value={comment}
          onChangeText={v => setComment(v.slice(0, 1000))}
          placeholder={rating <= 3 ? 'What could we do better? (optional)' : 'Anything you’d like to add? (optional)'}
          placeholderTextColor={colors.textLight}
          multiline
          style={s.input}
        />
      ) : null}

      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={s.row}>
        <MBtn variant="secondary" sm onPress={() => setState('dismissed')} style={{ flex: 1 }}>Not now</MBtn>
        <MBtn variant="primary" sm disabled={rating === 0 || state === 'sending'} onPress={() => void send()} style={{ flex: 1 }}>
          {state === 'sending' ? 'Sending…' : 'Send rating'}
        </MBtn>
      </View>
    </MCard>
  )
}

const s = StyleSheet.create({
  title: { fontFamily: fontWeights.bold, fontSize: 16, color: colors.navy },
  sub: { fontFamily: fontWeights.regular, fontSize: 14, lineHeight: 20, color: colors.textSub, marginTop: 4 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  star: { fontSize: 32, lineHeight: 38, color: colors.border },
  starOn: { color: '#F59E0B' },
  starLabel: { fontFamily: fontWeights.medium, fontSize: 14, color: colors.textSub, marginLeft: 6 },
  input: {
    marginTop: 12,
    minHeight: 72,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    fontFamily: fontWeights.regular,
    fontSize: 15.5,
    color: colors.text,
    textAlignVertical: 'top',
  },
  error: { fontFamily: fontWeights.medium, fontSize: 13.5, color: colors.error, marginTop: 8 },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
})
