import React from 'react'
import Svg, { Circle, Path } from 'react-native-svg'
import { colors } from '@/theme'

interface ProfileIconProps {
  size?: number
  color?: string
  active?: boolean
}

export default function ProfileIcon({ size = 22, color = colors.text, active = false }: ProfileIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Circle
        cx={11}
        cy={8}
        r={4}
        stroke={color}
        strokeWidth={active ? 2 : 1.5}
        fill={active ? `${color}26` : 'none'}
      />
      <Path
        d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8"
        stroke={color}
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  )
}
