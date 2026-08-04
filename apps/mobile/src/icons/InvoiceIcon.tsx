import React from 'react'
import Svg, { Rect, Line } from 'react-native-svg'
import { colors } from '@/theme'

interface InvoiceIconProps {
  size?: number
  color?: string
  active?: boolean
}

export default function InvoiceIcon({ size = 22, color = colors.text, active = false }: InvoiceIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Rect
        x={3}
        y={2}
        width={16}
        height={18}
        rx={2.5}
        stroke={color}
        strokeWidth={active ? 2 : 1.5}
        fill={active ? `${color}26` : 'none'}
      />
      <Line x1={7} y1={8} x2={15} y2={8} stroke={color} strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
      <Line x1={7} y1={12} x2={15} y2={12} stroke={color} strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
      <Line x1={7} y1={16} x2={12} y2={16} stroke={color} strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
    </Svg>
  )
}
