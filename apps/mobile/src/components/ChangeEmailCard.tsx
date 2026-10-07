import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Pressable from '@/components/Pressable'
import {
  useCancelEmailChangeMutation,
  useEmailChangeRequest,
  useRequestEmailChangeMutation,
} from '@gg/shared-hooks'
import { formatRelativeTime } from '@gg/shared-utils'
import { colors, fontWeights, radii } from '@/theme'
import { isValidEmail, normalizeEmail } from '@/lib/validation'
import MCard from './MCard'
import MBtn from './MBtn'
import Field from './Field'

/**
 * Sign-in email changes are requested here and approved by a GG'APP admin,
 * so an account can't be quietly moved to someone else's address.
 * Mirrors the PWA's ChangeEmailCard.
 */
export default function ChangeEmailCard({ currentEmail }: { currentEmail: string }) {
  const { data: latest } = useEmailChangeRequest()
  const request = useRequestEmailChangeMutation()
  const cancel = useCancelEmailChangeMutation()

  const [open, setOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const pending = latest?.status === 'pending'

  const close = () => {
    setOpen(false)
    setError(null)
    setNewEmail('')
    setPassword('')
    setReason('')
  }

  const submit = async () => {
    setError(null)
    const email = normalizeEmail(newEmail)
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (email === currentEmail.toLowerCase()) {
      setError('That is already your email address.')
      return
    }
    try {
      await request.mutateAsync({
        newEmail: email,
        password: password || undefined,
        reason: reason.trim() || undefined,
      })
      close()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We could not send your request.')
    }
  }

  const handleCancelRequest = async () => {
    try {
      await cancel.mutateAsync()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We could not cancel the request.')
    }
  }

  return (
    <MCard padding={18}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Sign-in email</Text>
          <Text style={styles.email}>{currentEmail}</Text>
          <Text style={styles.caption}>
            For your security, email changes are checked by the GG'APP team before they take effect.
          </Text>
        </View>
        {!open && !pending ? (
          <MBtn variant="secondary" sm onPress={() => setOpen(true)}>
            Change
          </MBtn>
        ) : null}
      </View>

      {pending && latest ? (
        <View style={[styles.notice, styles.noticePending]}>
          <Text style={[styles.noticeText, { color: colors.warning }]}>
            Waiting for approval to change to{' '}
            <Text style={styles.bold}>{latest.newEmail}</Text> · sent{' '}
            {formatRelativeTime(latest.createdAt)}. Keep using your current email until then.
          </Text>
          <Pressable
            onPress={handleCancelRequest}
            disabled={cancel.isPending}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.cancelLink}>{cancel.isPending ? 'Cancelling…' : 'Cancel request'}</Text>
          </Pressable>
        </View>
      ) : null}

      {!pending && latest?.status === 'rejected' ? (
        <View style={[styles.notice, styles.noticeRejected]}>
          <Text style={[styles.noticeText, { color: colors.error }]}>
            Your request to use {latest.newEmail} wasn't approved
            {latest.decisionNote ? `: ${latest.decisionNote}` : '.'}
          </Text>
        </View>
      ) : null}

      {!pending && latest?.status === 'approved' && latest.decidedAt ? (
        <Text style={styles.approved}>Email changed {formatRelativeTime(latest.decidedAt)}.</Text>
      ) : null}

      {open ? (
        <View style={styles.form}>
          <Field
            label="New email address"
            placeholder="name@example.com"
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Field
            label="Your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            hint="To confirm it's really you. Not needed if you sign in with Google."
          />
          <Field
            label="Why are you changing it? (optional)"
            placeholder="e.g. I no longer use my old work email"
            value={reason}
            onChangeText={setReason}
            maxLength={300}
          />
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">{error}</Text>
          ) : null}
          <View style={styles.actions}>
            <MBtn variant="secondary" sm onPress={close} style={{ flex: 1 }}>
              Cancel
            </MBtn>
            <MBtn variant="primary" sm onPress={submit} disabled={request.isPending} style={{ flex: 2 }}>
              {request.isPending ? 'Sending…' : 'Send for approval'}
            </MBtn>
          </View>
        </View>
      ) : !pending && error ? (
        <Text style={styles.error} accessibilityRole="alert">{error}</Text>
      ) : null}
    </MCard>
  )
}

const styles = StyleSheet.create({
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontFamily: fontWeights.bold,
    fontSize: 15,
    color: colors.text,
  },
  email: {
    fontFamily: fontWeights.medium,
    fontSize: 14,
    color: colors.text,
    marginTop: 4,
  },
  caption: {
    fontFamily: fontWeights.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSub,
    marginTop: 4,
  },
  notice: {
    marginTop: 14,
    padding: 12,
    borderRadius: radii.sm,
    gap: 8,
  },
  noticePending: {
    backgroundColor: colors.warningBg,
  },
  noticeRejected: {
    backgroundColor: colors.errorBg,
  },
  noticeText: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  bold: {
    fontFamily: fontWeights.bold,
  },
  cancelLink: {
    fontFamily: fontWeights.bold,
    fontSize: 13,
    color: colors.warning,
  },
  approved: {
    marginTop: 12,
    fontFamily: fontWeights.medium,
    fontSize: 13,
    color: colors.success,
  },
  form: {
    marginTop: 16,
  },
  error: {
    fontFamily: fontWeights.medium,
    fontSize: 13,
    color: colors.error,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
})
