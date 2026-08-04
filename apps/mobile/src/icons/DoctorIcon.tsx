import React from 'react'
import Svg, { Circle, Path } from 'react-native-svg'
import { colors } from '@/theme'

interface DoctorIconProps {
  size?: number
  color?: string
}

export default function DoctorIcon({ size = 22, color = colors.text }: DoctorIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Circle cx={11} cy={7} r={3.5} stroke={color} strokeWidth={1.5} />
      <Path
        d="M4 20c0-3.9 3.1-7 7-7s7 3.1 7 7"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  )
}
