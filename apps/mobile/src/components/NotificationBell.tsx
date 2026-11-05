import React from 'react'
import { Text, View, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { usePatientNotifications } from '@gg/shared-hooks'
import { useNotificationsStore } from '@gg/shared-stores'
import Pressable from '@/components/Pressable'
import BellIcon from '@/icons/BellIcon'
import { colors, fontWeights } from '@/theme'

/** Notifications bell with an unread badge. Rendered on the right of every tab-root app bar. */
export default function NotificationBell() {
  const navigation = useNavigation<any>()
  const { data: fetched } = usePatientNotifications()
  const stored = useNotificationsStore(s => s.patientNotifs)
  const unreadCount = (fetched ?? stored).filter(n => !n.read).length

  return (
    <Pressable
      style={styles.bell}
      onPress={() => navigation.navigate('Notifications')}
      accessibilityRole="button"
      accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
    >
      <BellIcon size={20} color="#FFFFFF" />
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.navy,
  },
  badgeText: {
    fontFamily: fontWeights.bold,
    fontSize: 11.5,
    color: '#FFFFFF',
  },
})
