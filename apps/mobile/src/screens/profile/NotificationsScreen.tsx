import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import Pressable from '@/components/Pressable'
import { usePullToRefresh } from '@/lib/usePullToRefresh'
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import { colors, fontWeights, radii, shadows } from '@/theme'
import {
  Screen,
  ScrollArea,
  AppBar,
  MCard,
  FilterChips,
  LoadError,
} from '@/components'
import BellIcon from '@/icons/BellIcon'
import CheckIcon from '@/icons/CheckIcon'
import {
  useMarkPatientNotificationReadMutation,
  usePatientNotifications,
} from '@gg/shared-hooks'
import { useNotificationsStore } from '@gg/shared-stores'
import { formatDate } from '@gg/shared-utils'
import { openPatientNotification } from '@/lib/patient-notification-routing'
import type { Notification, NotificationType } from '@gg/shared-types'

/* ------------------------------------------------------------------ */
/*  Type-specific icon components                                      */
/* ------------------------------------------------------------------ */
function PaymentIcon({ size = 18, color = colors.success }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 010 7H6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function InvoiceIcon({ size = 18, color = colors.warning }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={2} width={16} height={20} rx={2} stroke={color} strokeWidth={1.5} />
      <Line x1={8} y1={8} x2={16} y2={8} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={8} y1={12} x2={14} y2={12} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={8} y1={16} x2={12} y2={16} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

function AppointmentIcon({ size = 18, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={18} rx={2} stroke={color} strokeWidth={1.5} />
      <Line x1={16} y1={2} x2={16} y2={6} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={8} y1={2} x2={8} y2={6} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={3} y1={10} x2={21} y2={10} stroke={color} strokeWidth={1.5} />
    </Svg>
  )
}

function CreditIcon({ size = 18, color = colors.success }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={5} width={20} height={14} rx={2} stroke={color} strokeWidth={1.5} />
      <Line x1={2} y1={10} x2={22} y2={10} stroke={color} strokeWidth={1.5} />
      <Line x1={6} y1={15} x2={10} y2={15} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

function SystemIcon({ size = 18, color = colors.textSub }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
      <Line x1={12} y1={16} x2={12} y2={12} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={12} cy={8} r={0.5} fill={color} stroke={color} strokeWidth={1} />
    </Svg>
  )
}

function PrescriptionIcon({ size = 18, color = colors.teal }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 3h6l1 3h4v15H4V6h4l1-3z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M9 12h6M12 9v6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Icon + color map per notification type                             */
/* ------------------------------------------------------------------ */
const NOTIF_CONFIG: Record<
  string,
  { icon: React.ReactNode; bg: string }
> = {
  payment: {
    icon: <PaymentIcon size={18} color={colors.success} />,
    bg: colors.successBg,
  },
  invoice: {
    icon: <InvoiceIcon size={18} color={colors.warning} />,
    bg: colors.warningBg,
  },
  appointment: {
    icon: <AppointmentIcon size={18} color={colors.blueInk} />,
    bg: colors.blue100,
  },
  credit: {
    icon: <CreditIcon size={18} color={colors.success} />,
    bg: colors.successBg,
  },
  prescription: {
    icon: <PrescriptionIcon size={18} color={colors.teal} />,
    bg: colors.tealBg,
  },
  ledger: {
    icon: <SystemIcon size={18} color={colors.navy} />,
    bg: colors.blue100,
  },
  system: {
    icon: <SystemIcon size={18} color={colors.textSub} />,
    bg: colors.surfaceMuted,
  },
}

function getNotifConfig(type?: string) {
  return NOTIF_CONFIG[type ?? 'system'] ?? NOTIF_CONFIG.system
}

/* ------------------------------------------------------------------ */
/*  Filter chips                                                       */
/* ------------------------------------------------------------------ */
const FILTERS: { label: string; match: (n: Notification) => boolean }[] = [
  { label: 'All', match: () => true },
  { label: 'Unread', match: n => !n.read },
  { label: 'Appointments', match: n => n.type === 'appointment' },
  // Payments, invoices and credit are all "money" to a patient.
  { label: 'Payments', match: n => n.type === 'payment' || n.type === 'invoice' || n.type === 'credit' },
  { label: 'Prescriptions', match: n => n.type === 'prescription' },
]

/* ------------------------------------------------------------------ */
/*  Day grouping                                                       */
/* ------------------------------------------------------------------ */
function notifTimestamp(n: Notification): number {
  const t = new Date(n.time ?? n.date ?? n.createdAt ?? '').getTime()
  return Number.isNaN(t) ? 0 : t
}

function dayGroupLabel(ts: number, now = new Date()): string {
  if (!ts) return 'Earlier'
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const day = 24 * 60 * 60 * 1000
  if (ts >= startOfToday) return 'Today'
  if (ts >= startOfToday - day) return 'Yesterday'
  if (ts >= startOfToday - 6 * day) return 'This week'
  return 'Earlier'
}

/** Newest first, in Today / Yesterday / This week / Earlier sections. */
function groupByDay(list: Notification[]): { label: string; items: Notification[] }[] {
  const sorted = [...list].sort((a, b) => notifTimestamp(b) - notifTimestamp(a))
  const groups: { label: string; items: Notification[] }[] = []
  for (const n of sorted) {
    const label = dayGroupLabel(notifTimestamp(n))
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(n)
    else groups.push({ label, items: [n] })
  }
  return groups
}

/* ------------------------------------------------------------------ */
/*  Relative time helper                                               */
/* ------------------------------------------------------------------ */
function timeAgo(dateStr?: string): string {
  if (!dateStr) return ''
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  if (Number.isNaN(then)) return ''
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(dateStr)
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function NotificationsScreen() {
  const navigation = useNavigation<any>()
  const { data: fetchedNotifs, isLoading, isError, isFetching, refetch } = usePatientNotifications()
  const loadFailed = isError && !fetchedNotifs
  const pull = usePullToRefresh(refetch)
  const patientNotifs = useNotificationsStore(s => s.patientNotifs)
  const markNotificationRead = useMarkPatientNotificationReadMutation()

  const notifications: Notification[] = fetchedNotifs ?? patientNotifs ?? []
  const unreadCount = notifications.filter(n => !n.read).length

  const [activeChip, setActiveChip] = useState(0)

  /* filtered notifications */
  const filtered = useMemo(
    () => notifications.filter(FILTERS[activeChip]?.match ?? (() => true)),
    [activeChip, notifications],
  )
  const groups = useMemo(() => groupByDay(filtered), [filtered])

  /* chips with counts */
  const chipsWithCounts = useMemo(
    () =>
      FILTERS.map(f => {
        const count = notifications.filter(f.match).length
        return { label: f.label, count: count > 0 ? count : undefined }
      }),
    [notifications],
  )

  /* mark all read handler */
  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    try {
      await Promise.all(unreadIds.map(id => markNotificationRead.mutateAsync(id)))
    } catch {
      Alert.alert('Not all marked as read', 'Check your connection and try again.')
    }
  }

  /* loading */
  if (isLoading && notifications.length === 0) {
    return (
      <Screen>
        <AppBar
          title="Notifications"
          subtitle={`${unreadCount} unread`}
        />
        <View style={s.loadWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={s.loadText}>Loading notifications...</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <AppBar
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        right={
          unreadCount > 0 ? (
            <Pressable
              style={s.markAllBtn}
              onPress={handleMarkAllRead}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Mark all ${unreadCount} as read`}
            >
              <Text style={s.markAllText}>Mark all read</Text>
            </Pressable>
          ) : undefined
        }
      />

      <ScrollArea gap={12} px={16} py={14} {...pull}>
        {/* ============================================================ */}
        {/*  1. Filter Chips                                             */}
        {/* ============================================================ */}
        <FilterChips
          items={chipsWithCounts}
          activeIndex={activeChip}
          onSelect={setActiveChip}
        />

        {/* ============================================================ */}
        {/*  2. Notification Cards                                       */}
        {/* ============================================================ */}
        {loadFailed && (
          <LoadError
            title={
              notifications.length > 0
                ? "We couldn't refresh your notifications."
                : "We couldn't load your notifications."
            }
            body={
              notifications.length > 0
                ? 'Showing the ones saved on this phone. Check your connection and try again.'
                : undefined
            }
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        )}

        {filtered.length === 0 && !loadFailed && (
          <MCard padding={32}>
            <View style={s.emptyWrap}>
              <BellIcon size={28} color={colors.textLight} />
              <Text style={s.emptyTitle}>No notifications</Text>
              <Text style={s.emptyBody}>
                {activeChip === 0
                  ? "You're all caught up!"
                  : 'No notifications in this category.'}
              </Text>
            </View>
          </MCard>
        )}

        {groups.map(group => (
          <View key={group.label}>
            <Text style={s.groupLabel} accessibilityRole="header">
              {group.label}
            </Text>
            <View style={s.groupCard}>
              {group.items.map((notif, i) => {
                const config = getNotifConfig(notif.type)
                const isUnread = !notif.read
                const isLast = i === group.items.length - 1

                const handleNotifPress = () => {
                  if (!notif.read) {
                    markNotificationRead.mutate(notif.id)
                  }
                  openPatientNotification(navigation, notif)
                }

                return (
                  <Pressable
                    key={notif.id}
                    onPress={handleNotifPress}
                    style={({ pressed }) => [s.row, !isLast && s.rowDivider, pressed && s.rowPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`${isUnread ? 'Unread. ' : ''}${notif.title ?? 'Notification'}. ${notif.body ?? notif.message ?? ''}`}
                  >
                    {/* Unread = dot + bold title. No full-card tint, which hid the icon circles. */}
                    <View style={[s.unreadDot, !isUnread && s.unreadDotHidden]} />

                    <View style={[s.notifIconCircle, { backgroundColor: config.bg }]}>
                      {config.icon}
                    </View>

                    <View style={s.notifContent}>
                      <View style={s.notifTopRow}>
                        <Text style={[s.notifTitle, isUnread && s.notifTitleUnread]} numberOfLines={2}>
                          {notif.title ?? 'Notification'}
                        </Text>
                        <Text style={s.notifTime}>
                          {timeAgo(notif.time ?? notif.date ?? notif.createdAt)}
                        </Text>
                      </View>
                      {(notif.body || notif.message) ? (
                        <Text style={s.notifBody} numberOfLines={3}>
                          {notif.body ?? notif.message}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>
        ))}

        {/* bottom spacer */}
        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

export default NotificationsScreen

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */
const s = StyleSheet.create({
  /* loading */
  loadWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadText: {
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
  },

  /* mark-all-read button */
  markAllBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  markAllText: {
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: '#FFFFFF',
  },

  /* empty state */
  emptyWrap: {
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    textAlign: 'center',
  },

  /* grouped list */
  groupLabel: {
    fontSize: 13,
    fontFamily: fontWeights.semiBold,
    color: colors.textSub,
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: colors.card,
    borderRadius: radii.large,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 8,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  /* unread dot: occupies a fixed gutter so read and unread rows align */
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 15,
    backgroundColor: colors.blueInk,
  },
  unreadDotHidden: {
    backgroundColor: 'transparent',
  },

  /* icon circle */
  notifIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  /* content area */
  notifContent: {
    flex: 1,
    gap: 4,
  },
  notifTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  notifTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fontWeights.regular,
    color: colors.text,
  },
  notifTitleUnread: {
    fontFamily: fontWeights.bold,
  },
  notifTime: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textLight,
    flexShrink: 0,
  },
  notifBody: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 18,
  },
})

