import React from 'react'
import Svg, { Path } from 'react-native-svg'
import { colors } from '@/theme'

interface HomeIconProps {
  size?: number
  color?: string
  active?: boolean
}

export default function HomeIcon({ size = 22, color = colors.text, active = false }: HomeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path
        d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={color}
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? `${color}26` : 'none'}
      />
      <Path
        d="M8 20v-6h6v6"
        stroke={color}
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
