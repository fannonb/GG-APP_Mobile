import React from 'react'
import Svg, { Path } from 'react-native-svg'
import { colors } from '@/theme'

interface CheckIconProps {
  size?: number
  color?: string
}

export default function CheckIcon({ size = 22, color = colors.text }: CheckIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12l5 5 9-9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
