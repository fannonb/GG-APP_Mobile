import React from 'react'
import Svg, { Rect, Line } from 'react-native-svg'
import { colors } from '@/theme'

interface PharmacyIconProps {
  size?: number
  color?: string
}

export default function PharmacyIcon({ size = 22, color = colors.text }: PharmacyIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Rect x={4} y={4} width={14} height={14} rx={3.5} stroke={color} strokeWidth={1.5} />
      <Line x1={11} y1={7} x2={11} y2={15} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={7} y1={11} x2={15} y2={11} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}
