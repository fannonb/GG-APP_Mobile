import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontWeights, radii, shadows } from '@/theme'
import MBtn from './MBtn'
import CalendarIcon from '@/icons/CalendarIcon'

const ITEM_HEIGHT = 44
const VISIBLE_ITEMS = 5
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const MONTH_ITEMS: string[] = [...MONTHS]

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function clampDate(date: Date, min: Date, max: Date) {
  if (date < min) return new Date(min)
  if (date > max) return new Date(max)
  return date
}

interface PickerWheelProps {
  items: string[]
  selectedIndex: number
  onSelectIndex: (index: number) => void
  flex?: number
}

const PickerWheel = React.memo(function PickerWheel({
  items,
  selectedIndex,
  onSelectIndex,
  flex = 1,
}: PickerWheelProps) {
  const scrollRef = useRef<ScrollView>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastAlignedOffset = useRef<number | null>(null)
  const padding = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2)

  const clearPendingSettle = useCallback(() => {
    if (settleTimer.current) {
      clearTimeout(settleTimer.current)
      settleTimer.current = null
    }
  }, [])

  useEffect(() => clearPendingSettle, [clearPendingSettle])

  /** Snaps the wheel to the nearest item and reports the selection. */
  const settle = useCallback(
    (offsetY: number) => {
      const index = Math.max(0, Math.min(items.length - 1, Math.round(offsetY / ITEM_HEIGHT)))
      const target = index * ITEM_HEIGHT
      lastAlignedOffset.current = target
      // Correct rounding drift only — never cancel an in-progress gesture.
      if (Math.abs(offsetY - target) > 1) {
        scrollRef.current?.scrollTo({ y: target, animated: false })
      }
      onSelectIndex(index)
    },
    [items.length, onSelectIndex],
  )

  // Align when the wheel opens and when external changes move the selection
  // (e.g. the day list shrinks after picking February). The user's own scrolls
  // settle through settle(), which records the aligned offset, so this effect
  // never overrides a gesture mid-flight.
  useEffect(() => {
    if (selectedIndex < 0) return
    const target = selectedIndex * ITEM_HEIGHT
    if (lastAlignedOffset.current === null) {
      scrollRef.current?.scrollTo({ y: target, animated: false })
      lastAlignedOffset.current = target
      return
    }
    if (Math.abs(lastAlignedOffset.current - target) > 1) {
      scrollRef.current?.scrollTo({ y: target, animated: false })
      lastAlignedOffset.current = target
    }
  }, [items.length, selectedIndex])

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Capture the offset synchronously: React Native pools scroll events, so
    // event.nativeEvent is null by the time the delayed settle below runs.
    const offsetY = event.nativeEvent.contentOffset.y
    // A fling fires onMomentumScrollBegin right after this and cancels the
    // timer. Snapping here would kill the momentum and make the wheel jumpy,
    // especially on long lists like the year wheel.
    clearPendingSettle()
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null
      settle(offsetY)
    }, 140)
  }

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    clearPendingSettle()
    settle(event.nativeEvent.contentOffset.y)
  }

  return (
    <View style={[styles.wheelColumn, { flex }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToStart
        snapToEnd
        decelerationRate="fast"
        nestedScrollEnabled
        onScrollBeginDrag={clearPendingSettle}
        onMomentumScrollBegin={clearPendingSettle}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentContainerStyle={{ paddingVertical: padding }}
      >
        {items.map((item, index) => {
          const selected = index === selectedIndex
          return (
            <View key={`${item}-${index}`} style={styles.wheelItem}>
              <Text
                style={[
                  styles.wheelItemText,
                  selected ? styles.wheelItemTextSelected : styles.wheelItemTextIdle,
                ]}
              >
                {item}
              </Text>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
})

export interface DatePickerModalProps {
  visible: boolean
  value: Date
  title?: string
  maximumDate?: Date
  minimumDate?: Date
  onConfirm: (date: Date) => void
  onCancel: () => void
}

export default function DatePickerModal({
  visible,
  value,
  title = 'Select Date',
  maximumDate = new Date(),
  minimumDate = new Date(new Date().getFullYear() - 120, 0, 1),
  onConfirm,
  onCancel,
}: DatePickerModalProps) {
  const insets = useSafeAreaInsets()
  const [draft, setDraft] = useState(() => clampDate(value, minimumDate, maximumDate))

  // Latest draft, readable from stable callbacks without re-creating them.
  const draftRef = useRef(draft)
  draftRef.current = draft

  useEffect(() => {
    if (visible) {
      setDraft(clampDate(value, minimumDate, maximumDate))
    }
  }, [visible, value, minimumDate, maximumDate])

  const years = useMemo(() => {
    const minYear = minimumDate.getFullYear()
    const maxYear = maximumDate.getFullYear()
    return Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(minYear + i))
  }, [minimumDate, maximumDate])

  const dayCount = daysInMonth(draft.getFullYear(), draft.getMonth())
  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => String(i + 1).padStart(2, '0')),
    [dayCount],
  )

  const dayIndex = Math.min(draft.getDate() - 1, dayCount - 1)
  const monthIndex = draft.getMonth()
  const yearIndex = Math.max(0, years.indexOf(String(draft.getFullYear())))

  const updateDraft = useCallback(
    (day: number, month: number, year: number) => {
      setDraft(current => {
        const maxDay = daysInMonth(year, month)
        const safeDay = Math.min(day, maxDay)
        const next = clampDate(new Date(year, month, safeDay), minimumDate, maximumDate)
        if (
          next.getDate() === current.getDate() &&
          next.getMonth() === current.getMonth() &&
          next.getFullYear() === current.getFullYear()
        ) {
          return current
        }
        return next
      })
    },
    [minimumDate, maximumDate],
  )

  const handleDaySelect = useCallback(
    (index: number) => {
      const current = draftRef.current
      updateDraft(index + 1, current.getMonth(), current.getFullYear())
    },
    [updateDraft],
  )

  const handleMonthSelect = useCallback(
    (index: number) => {
      const current = draftRef.current
      updateDraft(current.getDate(), index, current.getFullYear())
    },
    [updateDraft],
  )

  const handleYearSelect = useCallback(
    (index: number) => {
      const current = draftRef.current
      updateDraft(current.getDate(), current.getMonth(), Number(years[index]))
    },
    [updateDraft, years],
  )

  const handleConfirm = () => {
    onConfirm(draftRef.current)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Close date picker" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <CalendarIcon size={20} color={colors.blue} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>Scroll to choose day, month, and year</Text>
            </View>
          </View>

          <View style={styles.pickerWrap}>
            <View style={styles.selectionBand} pointerEvents="none" />
            <View style={styles.pickerRow}>
              <PickerWheel
                flex={0.7}
                items={days}
                selectedIndex={dayIndex}
                onSelectIndex={handleDaySelect}
              />
              <PickerWheel
                flex={1.4}
                items={MONTH_ITEMS}
                selectedIndex={monthIndex}
                onSelectIndex={handleMonthSelect}
              />
              <PickerWheel
                flex={0.9}
                items={years}
                selectedIndex={yearIndex}
                onSelectIndex={handleYearSelect}
              />
            </View>
            <View style={styles.columnLabels} pointerEvents="none">
              <Text style={[styles.columnLabel, styles.colDay]}>Day</Text>
              <Text style={[styles.columnLabel, styles.colMonth]}>Month</Text>
              <Text style={[styles.columnLabel, styles.colYear]}>Year</Text>
            </View>
          </View>

          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Selected</Text>
            <Text style={styles.previewValue}>
              {String(draft.getDate()).padStart(2, '0')}/
              {String(draft.getMonth() + 1).padStart(2, '0')}/{draft.getFullYear()}
            </Text>
          </View>

          <View style={styles.actions}>
            <MBtn variant="secondary" style={styles.actionBtn} onPress={onCancel}>
              Cancel
            </MBtn>
            <MBtn variant="primary" style={styles.actionBtn} onPress={handleConfirm}>
              Confirm
            </MBtn>
          </View>
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
    ...StyleSheet.absoluteFill,
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
    marginBottom: 16,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.blue3,
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
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.textSub,
    marginTop: 2,
  },
  pickerWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    height: WHEEL_HEIGHT,
    overflow: 'hidden',
  },
  selectionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    borderRadius: radii.default,
    backgroundColor: colors.blue3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wheelColumn: {
    height: WHEEL_HEIGHT,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  wheelItemText: {
    fontSize: 16,
    textAlign: 'center',
  },
  wheelItemTextSelected: {
    fontFamily: fontWeights.bold,
    fontSize: 17,
    color: colors.navy,
  },
  wheelItemTextIdle: {
    fontFamily: fontWeights.medium,
    color: colors.textLight,
  },
  columnLabels: {
    flexDirection: 'row',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  columnLabel: {
    textAlign: 'center',
    fontFamily: fontWeights.semiBold,
    fontSize: 11,
    color: colors.textSub,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  colDay: { flex: 0.7 },
  colMonth: { flex: 1.4 },
  colYear: { flex: 0.9 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    borderRadius: radii.default,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  previewLabel: {
    fontFamily: fontWeights.semiBold,
    fontSize: 13,
    color: colors.textSub,
  },
  previewValue: {
    fontFamily: fontWeights.bold,
    fontSize: 16,
    color: colors.navy,
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
  },
})
