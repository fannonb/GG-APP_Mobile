import React, { useState } from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { colors, fontWeights } from '@/theme'

interface MAvatarProps {
  name?: string
  size?: number
  bg?: string
  /** Photo to show instead of the initials. If it fails to load, the initials show. */
  uri?: string | null
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

export default function MAvatar({ name = 'U', size = 40, bg = colors.blue, uri }: MAvatarProps) {
  const initials = getInitials(name)
  const fontSize = size * 0.36
  // Photo URLs are short-lived. A uri that failed is remembered, so only a new uri is tried again.
  const [failedUri, setFailedUri] = useState<string | null>(null)
  const photoUri = uri && uri !== failedUri ? uri : null

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
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
          onError={() => setFailedUri(photoUri)}
        />
      ) : (
        <Text
          style={{
            fontFamily: fontWeights.extraBold,
            fontSize,
            color: '#FFFFFF',
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
