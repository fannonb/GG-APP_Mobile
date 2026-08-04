import React from 'react'
import Svg, { Rect, Circle, Line } from 'react-native-svg'
import { colors } from '@/theme'

interface WalletIconProps {
  size?: number
  color?: string
  active?: boolean
}

export default function WalletIcon({ size = 22, color = colors.text, active = false }: WalletIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Rect
        x={1}
        y={5}
        width={20}
        height={14}
        rx={2.5}
        stroke={color}
        strokeWidth={active ? 2 : 1.5}
        fill={active ? `${color}26` : 'none'}
      />
      <Circle cx={16.5} cy={12} r={2.2} fill={color} />
      <Line x1={1} y1={9} x2={21} y2={9} stroke={color} strokeWidth={active ? 2 : 1.5} />
    </Svg>
  )
}
