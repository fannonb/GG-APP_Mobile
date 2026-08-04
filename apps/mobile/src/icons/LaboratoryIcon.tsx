import React from 'react'
import Svg, { Path, Line } from 'react-native-svg'
import { colors } from '@/theme'

interface LaboratoryIconProps {
  size?: number
  color?: string
}

export default function LaboratoryIcon({ size = 22, color = colors.text }: LaboratoryIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path
        d="M9 4v8L4 18a2 2 0 001.8 2.5h10.4A2 2 0 0018 18l-5-6V4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={9} y1={4} x2={13} y2={4} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}
