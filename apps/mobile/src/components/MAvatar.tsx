import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, fontWeights } from '@/theme'

interface MAvatarProps {
  name?: string
  size?: number
  bg?: string
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function MAvatar({ name = 'U', size = 40, bg = colors.blue }: MAvatarProps) {
  const initials = getInitials(name)
  const fontSize = size * 0.36

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: fontWeights.extraBold,
          fontSize,
          color: '#FFFFFF',
        }}
      >
        {initials}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
