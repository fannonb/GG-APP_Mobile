import React from 'react'
import Svg, { Path, Line } from 'react-native-svg'
import { colors } from '@/theme'

interface BellIconProps {
  size?: number
  color?: string
}

export default function BellIcon({ size = 22, color = colors.text }: BellIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M9 2C6.2 2 4 4.2 4 7v4l-1.5 2h13L14 11V7c0-2.8-2.2-5-5-5z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={7} y1={15} x2={11} y2={15} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}
