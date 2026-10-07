import React from 'react'
import Svg, { Path } from 'react-native-svg'
import { colors } from '@/theme'

interface BankIconProps {
  size?: number
  color?: string
}

/** A bank facade: roof, four columns, base. For finance partners. */
export default function BankIcon({ size = 22, color = colors.text }: BankIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9.5L12 4l9 5.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M3 20.5h18" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}
