import React from 'react'
import Svg, { Circle, Line } from 'react-native-svg'
import { colors } from '@/theme'

interface SearchIconProps {
  size?: number
  color?: string
  active?: boolean
}

export default function SearchIcon({ size = 22, color = colors.text, active = false }: SearchIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Circle
        cx={9.5}
        cy={9.5}
        r={6}
        stroke={color}
        strokeWidth={active ? 2 : 1.5}
        fill={active ? `${color}26` : 'none'}
      />
      <Line
        x1={14}
        y1={14}
        x2={19}
        y2={19}
        stroke={color}
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
      />
    </Svg>
  )
}
