import React from 'react'
import Svg, { Path } from 'react-native-svg'
import { colors } from '@/theme'

interface ClinicIconProps {
  size?: number
  color?: string
}

export default function ClinicIcon({ size = 22, color = colors.text }: ClinicIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path
        d="M11 3L3 8v12h5v-4h6v4h5V8z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
