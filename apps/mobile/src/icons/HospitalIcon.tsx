import React from 'react'
import Svg, { Rect, Path, Line } from 'react-native-svg'
import { colors } from '@/theme'

interface HospitalIconProps {
  size?: number
  color?: string
}

export default function HospitalIcon({ size = 22, color = colors.text }: HospitalIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Rect x={3} y={6} width={16} height={13} rx={1.5} stroke={color} strokeWidth={1.5} />
      <Path d="M8 19v-6h6v6" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={11} y1={9} x2={11} y2={13} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={9} y1={11} x2={13} y2={11} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}
