import React, { useState } from 'react'

import Pressable from '@/components/Pressable'
import { colors } from '@/theme'
import Field from './Field'
import DatePickerModal from './DatePickerModal'
import CalendarIcon from '@/icons/CalendarIcon'
import {
  dateToDobDisplay,
  defaultDobPickerDate,
  formatDobDisplay,
  parseDobToDate,
} from '@/lib/dates'

interface DateFieldProps {
  label: string
  value: string
  onChangeText: (text: string) => void
  required?: boolean
  error?: string
  hint?: string
  maximumDate?: Date
  minimumDate?: Date
  variant?: 'light' | 'dark'
}

export default function DateField({
  label,
  value,
  onChangeText,
  required,
  error,
  hint,
  maximumDate = new Date(),
  minimumDate = new Date(new Date().getFullYear() - 120, 0, 1),
  variant = 'light',
}: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false)
  const pickerDate = parseDobToDate(value) ?? defaultDobPickerDate()

  const handleTextChange = (text: string) => {
    onChangeText(formatDobDisplay(text))
  }

  return (
    <>
      <Field
        label={label}
        placeholder="DD/MM/YYYY"
        value={value}
        onChangeText={handleTextChange}
        keyboardType="number-pad"
        required={required}
        error={error}
        hint={hint}
        variant={variant}
        right={
          <Pressable
            onPress={() => setShowPicker(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open date picker"
          >
            <CalendarIcon size={20} color={variant === 'dark' ? 'rgba(255,255,255,0.5)' : colors.textSub} />
          </Pressable>
        }
      />
      <DatePickerModal
        visible={showPicker}
        value={pickerDate}
        title={label}
        maximumDate={maximumDate}
        minimumDate={minimumDate}
        onConfirm={date => {
          onChangeText(dateToDobDisplay(date))
          setShowPicker(false)
        }}
        onCancel={() => setShowPicker(false)}
      />
    </>
  )
}
