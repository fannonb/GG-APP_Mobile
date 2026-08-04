import React from 'react'
import Svg, { Path, Line } from 'react-native-svg'
import { colors } from '@/theme'

interface DeleteIconProps {
  size?: number
  color?: string
}

export default function DeleteIcon({ size = 22, color = colors.text }: DeleteIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={14} y1={9.5} x2={18} y2={13.5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={18} y1={9.5} x2={14} y2={13.5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}
