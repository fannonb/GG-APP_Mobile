import React from 'react'
import Svg, { Rect, Path } from 'react-native-svg'
import { colors } from '@/theme'

interface LockIconProps {
  size?: number
  color?: string
}

export default function LockIcon({ size = 22, color = colors.text }: LockIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={11}
        width={18}
        height={11}
        rx={2}
        stroke={color}
        strokeWidth={1.5}
      />
      <Path
        d="M7 11V7a5 5 0 0110 0v4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
