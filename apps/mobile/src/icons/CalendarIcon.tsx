import React from 'react'
import Svg, { Rect, Line } from 'react-native-svg'
import { colors } from '@/theme'

interface CalendarIconProps {
  size?: number
  color?: string
}

export default function CalendarIcon({ size = 22, color = colors.text }: CalendarIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={18} rx={2} stroke={color} strokeWidth={1.5} />
      <Line x1={16} y1={2} x2={16} y2={6} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={8} y1={2} x2={8} y2={6} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={3} y1={10} x2={21} y2={10} stroke={color} strokeWidth={1.5} />
    </Svg>
  )
}
