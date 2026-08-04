import React from 'react'
import Svg, { Circle, Line } from 'react-native-svg'
import { colors } from '@/theme'

interface RadiologyIconProps {
  size?: number
  color?: string
}

export default function RadiologyIcon({ size = 22, color = colors.text }: RadiologyIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={1.5} />
      <Line x1={11} y1={4} x2={11} y2={7} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={11} y1={15} x2={11} y2={18} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={4} y1={11} x2={7} y2={11} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={15} y1={11} x2={18} y2={11} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}
