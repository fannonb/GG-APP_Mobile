import React from 'react'
import Svg, { Circle, Path } from 'react-native-svg'
import { colors } from '@/theme'

interface GlobeIconProps {
  size?: number
  color?: string
}

export default function GlobeIcon({ size = 22, color = colors.text }: GlobeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Circle cx={11} cy={11} r={8} stroke={color} strokeWidth={1.5} />
      <Path
        d="M11 3c2.5 2.5 3.5 5 3.5 8s-1 5.5-3.5 8c-2.5-2.5-3.5-5-3.5-8s1-5.5 3.5-8z"
        stroke={color}
        strokeWidth={1.5}
      />
      <Path d="M3.5 8.5h15" stroke={color} strokeWidth={1.5} />
      <Path d="M3.5 13.5h15" stroke={color} strokeWidth={1.5} />
    </Svg>
  )
}
