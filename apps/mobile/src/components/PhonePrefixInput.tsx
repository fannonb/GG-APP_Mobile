import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  FlatList,
  Image,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontWeights, radii } from '@/theme'
import {
  COUNTRIES,
  WORLD_COUNTRIES,
  getCountryDial,
  getCountryPhonePlaceholder,
  flagUrl,
  isOperatingCountryCode,
} from '@gg/shared-config'

type PickerItem =
  | { type: 'header'; id: string; label: string }
  | { type: 'row'; id: string; name: string; dial: string }

interface PhonePrefixInputProps {
  label?: string
  required?: boolean
  error?: string
  hint?: string
  countryCode: string
  onCountryChange?: (code: string) => void
  digits: string
  onDigitsChange: (digits: string) => void
  disabled?: boolean
  variant?: 'light' | 'dark'
  allowCountrySelect?: boolean
}

function FlagThumb({ code }: { code: string }) {
  return (
    <Image
      source={{ uri: flagUrl(code, 40) }}
      style={styles.flag}
      accessibilityIgnoresInvertColors
    />
  )
}

export default function PhonePrefixInput({
  label = 'Phone Number',
  required,
  error,
  hint,
  countryCode,
  onCountryChange,
  digits,
  onDigitsChange,
  disabled,
  variant = 'light',
  allowCountrySelect = true,
}: PhonePrefixInputProps) {
  const insets = useSafeAreaInsets()
  const [focused, setFocused] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const isDark = variant === 'dark'
  const dial = getCountryDial(countryCode)
  const placeholder = getCountryPhonePlaceholder(countryCode)

  const operating = COUNTRIES
  const others = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = WORLD_COUNTRIES.filter(c => !isOperatingCountryCode(c.code))
    if (!q) return list
    return list.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q),
    )
  }, [search])

  const borderColor = error
    ? colors.error
    : focused
      ? isDark
        ? colors.blue
        : colors.navy
      : isDark
        ? 'rgba(255,255,255,0.1)'
        : colors.border

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text>
        {required && !isDark ? <Text style={styles.asterisk}> *</Text> : null}
      </View>

      <View
        style={[
          styles.row,
          isDark && styles.rowDark,
          { borderColor },
        ]}
      >
        <Pressable
          disabled={disabled || !allowCountrySelect}
          onPress={() => setPickerOpen(true)}
          style={[styles.prefixBtn, isDark && styles.prefixBtnDark]}
          accessibilityRole="button"
          accessibilityLabel="Choose country dial code"
        >
          <FlagThumb code={countryCode} />
          <Text style={[styles.dialText, isDark && styles.dialTextDark]}>{dial}</Text>
        </Pressable>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          value={digits}
          placeholder={placeholder}
          placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : colors.textLight}
          keyboardType="phone-pad"
          editable={!disabled}
          onChangeText={text => onDigitsChange(text.replace(/\D/g, ''))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hint && !error ? (
        <Text style={[styles.hint, isDark && styles.hintDark]}>{hint}</Text>
      ) : null}

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={[styles.modal, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Country code</Text>
            <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}>
              <Text style={styles.modalClose}>Done</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Search country or dial code"
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
          />
          <FlatList<PickerItem>
            data={[
              { type: 'header' as const, id: 'op', label: 'Operating Markets' },
              ...operating.map(c => ({ type: 'row' as const, id: c.code, name: c.name, dial: c.dial })),
              { type: 'header' as const, id: 'ot', label: 'Other Countries' },
              ...others.map(c => ({ type: 'row' as const, id: c.code, name: c.name, dial: c.dial })),
            ]}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return <Text style={styles.sectionLabel}>{item.label}</Text>
              }
              const active = item.id === countryCode
              return (
                <Pressable
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    onCountryChange?.(item.id)
                    setPickerOpen(false)
                    setSearch('')
                  }}
                >
                  <FlagThumb code={item.id} />
                  <Text style={[styles.optionName, active && styles.optionNameActive]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.optionDial}>{item.dial}</Text>
                </Pressable>
              )
            }}
          />
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', marginBottom: 6 },
  label: { fontFamily: fontWeights.semiBold, fontSize: 14, color: colors.navy },
  labelDark: { color: 'rgba(255,255,255,0.9)', fontFamily: fontWeights.medium },
  asterisk: { fontFamily: fontWeights.bold, fontSize: 14, color: colors.error },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  rowDark: { backgroundColor: 'rgba(255,255,255,0.04)' },
  prefixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  prefixBtnDark: { borderRightColor: 'rgba(255,255,255,0.1)' },
  flag: { width: 22, height: 16, borderRadius: 2, backgroundColor: colors.surfaceMuted },
  dialText: { fontFamily: fontWeights.semiBold, fontSize: 14, color: colors.navy },
  dialTextDark: { color: '#FFFFFF' },
  input: {
    flex: 1,
    fontFamily: fontWeights.regular,
    fontSize: 15,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputDark: { color: '#FFFFFF' },
  error: { marginTop: 6, fontSize: 12, fontFamily: fontWeights.medium, color: colors.error },
  hint: { marginTop: 6, fontSize: 12, fontFamily: fontWeights.regular, color: colors.textSub },
  hintDark: { color: 'rgba(255,255,255,0.55)' },
  modal: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontFamily: fontWeights.extraBold, fontSize: 20, color: colors.navy },
  modalClose: { fontFamily: fontWeights.bold, fontSize: 15, color: colors.blueInk },
  search: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fontWeights.regular,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: fontWeights.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.textLight,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
  },
  optionActive: { backgroundColor: colors.blue100 },
  optionName: { flex: 1, fontFamily: fontWeights.medium, fontSize: 14, color: colors.text },
  optionNameActive: { color: colors.blueInk, fontFamily: fontWeights.bold },
  optionDial: { fontFamily: fontWeights.semiBold, fontSize: 13, color: colors.textSub },
})
