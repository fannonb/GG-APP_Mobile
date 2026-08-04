import { Linking, Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'

/**
 * Android 7+ forbids exposing raw `file://` URIs to other apps via Intent
 * (FileUriExposedException). Use the system share sheet / content URI instead.
 */
export async function openLocalFile(
  fileUri: string,
  options?: { mimeType?: string; dialogTitle?: string },
): Promise<void> {
  if (Platform.OS === 'android') {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: options?.mimeType,
        dialogTitle: options?.dialogTitle ?? 'Open document',
      })
      return
    }

    // Fallback: content:// URI via Expo's FileProvider bridge.
    const contentUri = await FileSystem.getContentUriAsync(fileUri)
    await Linking.openURL(contentUri)
    return
  }

  // iOS can open local files directly.
  await Linking.openURL(fileUri)
}

export async function openRemoteOrDataAttachment(params: {
  url: string
  fileName: string
  mimeType?: string
  cacheKey: string
}): Promise<void> {
  const { url, fileName, mimeType, cacheKey } = params

  if (url.startsWith('https://') || url.startsWith('http://')) {
    await Linking.openURL(url)
    return
  }

  if (url.startsWith('file://')) {
    await openLocalFile(url, { mimeType, dialogTitle: fileName })
    return
  }

  const match = /^data:([^;]+);base64,(.+)$/i.exec(url)
  if (!match) {
    throw new Error('Unsupported attachment format.')
  }

  const resolvedMime = mimeType || match[1] || 'application/octet-stream'
  const ext = extensionFromMimeType(resolvedMime, fileName)
  const safeKey = cacheKey.replace(/[^a-zA-Z0-9._-]/g, '_')
  const fileUri = `${FileSystem.cacheDirectory}${safeKey}${ext}`

  await FileSystem.writeAsStringAsync(fileUri, match[2], {
    encoding: FileSystem.EncodingType.Base64,
  })

  await openLocalFile(fileUri, {
    mimeType: resolvedMime,
    dialogTitle: fileName,
  })
}

function extensionFromMimeType(mimeType?: string, fileName?: string) {
  const lowerName = fileName?.toLowerCase() ?? ''
  if (lowerName.includes('.')) {
    return lowerName.slice(lowerName.lastIndexOf('.'))
  }

  switch (mimeType) {
    case 'application/pdf':
      return '.pdf'
    case 'image/png':
      return '.png'
    case 'image/jpeg':
      return '.jpg'
    case 'image/webp':
      return '.webp'
    case 'application/msword':
      return '.doc'
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return '.docx'
    default:
      return '.bin'
  }
}
