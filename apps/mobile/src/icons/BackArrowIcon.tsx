import React from 'react'
import Svg, { Path } from 'react-native-svg'
import { colors } from '@/theme'

interface BackArrowIconProps {
  size?: number
  color?: string
}

export default function BackArrowIcon({ size = 22, color = colors.text }: BackArrowIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
