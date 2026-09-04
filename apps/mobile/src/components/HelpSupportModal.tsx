import React from 'react'
import { View, Text, Modal, Pressable, StyleSheet, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle } from 'react-native-svg'
import { colors, fontWeights, radii, shadows } from '@/theme'
import MBtn from './MBtn'

const SUPPORT_EMAIL = 'support@gatewayglobal.africa'
const WHATSAPP_DISPLAY = '+263 77 123 4567'
const WHATSAPP_URL = 'https://wa.me/263771234567'

type HelpSupportModalProps = {
  visible: boolean
  onClose: () => void
}

function HelpIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9.25} stroke={colors.blueInk} strokeWidth={1.8} />
      <Path
        d="M9.1 9a3 3 0 015.82 1c0 2-3 3-3 3"
        stroke={colors.blueInk}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 17.25h.01" stroke={colors.blueInk} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  )
}

function MailIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6.5h16v11H4v-11z"
        stroke={colors.navy}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path
        d="M4.5 7.2l7.5 6.1 7.5-6.1"
        stroke={colors.navy}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function WhatsAppIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4.5a7.5 7.5 0 00-6.4 11.4L5 19.5l3.7-.6A7.5 7.5 0 1012 4.5z"
        stroke={colors.navy}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path
        d="M9.2 9.4c.2-.5.4-.5.6-.5h.5c.2 0 .4.1.5.4l.6 1.4c.1.2 0 .5-.2.6l-.4.4c-.1.1-.1.3 0 .5.3.5.8 1 1.3 1.3.2.1.4.1.5 0l.4-.4c.2-.2.4-.3.6-.2l1.4.6c.3.1.4.3.4.5v.5c0 .2 0 .4-.5.6-.5.3-1.2.4-2 .2-1.9-.5-3.4-2-3.9-3.9-.2-.8-.1-1.5.2-2z"
        fill={colors.navy}
      />
    </Svg>
  )
}

function ChevronIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Path
        d="M5 2.5L10 7l-5 4.5"
        stroke={colors.textLight}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export default function HelpSupportModal({ visible, onClose }: HelpSupportModalProps) {
  const insets = useSafeAreaInsets()

  const openEmail = () => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)
  }

  const openWhatsApp = () => {
    void Linking.openURL(WHATSAPP_URL)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close help and support"
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <HelpIcon />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Help & Support</Text>
              <Text style={styles.subtitle}>Available 24/7</Text>
            </View>
          </View>

          <Text style={styles.body}>
            Need help with appointments, prescriptions, invoices, or your account? Reach the
            Gateway Global team by email or WhatsApp.
          </Text>

          <Pressable
            style={styles.contactRow}
            onPress={openEmail}
            accessibilityRole="link"
            accessibilityLabel={`Email ${SUPPORT_EMAIL}`}
          >
            <View style={styles.contactIcon}>
              <MailIcon />
            </View>
            <View style={styles.contactCopy}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>{SUPPORT_EMAIL}</Text>
            </View>
            <ChevronIcon />
          </Pressable>

          <Pressable
            style={styles.contactRow}
            onPress={openWhatsApp}
            accessibilityRole="link"
            accessibilityLabel={`WhatsApp ${WHATSAPP_DISPLAY}`}
          >
            <View style={styles.contactIcon}>
              <WhatsAppIcon />
            </View>
            <View style={styles.contactCopy}>
              <Text style={styles.contactLabel}>WhatsApp</Text>
              <Text style={styles.contactValue}>{WHATSAPP_DISPLAY}</Text>
            </View>
            <ChevronIcon />
          </Pressable>

          <MBtn variant="primary" fullWidth onPress={onClose} style={styles.closeBtn}>
            Close
          </MBtn>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 30, 66, 0.45)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.large,
    borderTopRightRadius: radii.large,
    paddingTop: 8,
    paddingHorizontal: 20,
    ...shadows.raised,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.blue100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: fontWeights.bold,
    fontSize: 17,
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fontWeights.semiBold,
    fontSize: 12,
    color: colors.blueInk,
    marginTop: 2,
  },
  body: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSub,
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radii.default,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    marginBottom: 10,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactCopy: {
    flex: 1,
  },
  contactLabel: {
    fontFamily: fontWeights.semiBold,
    fontSize: 11,
    color: colors.textLight,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  contactValue: {
    fontFamily: fontWeights.semiBold,
    fontSize: 14,
    color: colors.navy,
    marginTop: 2,
  },
  closeBtn: {
    marginTop: 8,
  },
})
