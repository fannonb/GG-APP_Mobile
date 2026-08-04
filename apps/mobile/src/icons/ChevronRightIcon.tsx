import React from 'react'
import Svg, { Path } from 'react-native-svg'
import { colors } from '@/theme'

interface ChevronRightIconProps {
  size?: number
  color?: string
}

export default function ChevronRightIcon({ size = 22, color = colors.text }: ChevronRightIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
