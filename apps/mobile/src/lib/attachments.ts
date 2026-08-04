import { Directory, File, Paths } from 'expo-file-system'
import * as FileSystem from 'expo-file-system/legacy'

export type UploadAttachment = {
  name: string
  type: 'pdf' | 'image' | 'document'
  size: string
  mimeType: string
  sizeBytes: number
  storageKey: string
  dataUrl?: string
}

const SUPPORTED_ATTACHMENT_EXTENSIONS = /\.(pdf|png|jpe?g|webp|doc|docx)$/i

export function formatAttachmentSize(bytes?: number) {
  if (!bytes || bytes <= 0) return '0 KB'
  if (bytes >= 1024 * 1024) {
    return `${Math.max(1, Math.round((bytes / (1024 * 1024)) * 10) / 10)} MB`
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function inferAttachmentType(
  name: string,
  mimeType?: string | null,
): UploadAttachment['type'] {
  const lower = name.toLowerCase()
  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf'
  if ((mimeType ?? '').startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(lower)) {
    return 'image'
  }
  return 'document'
}

export function isSupportedPatientAttachment(name: string, mimeType?: string | null) {
  return (
    mimeType === 'application/pdf' ||
    (mimeType ?? '').startsWith('image/') ||
    mimeType === 'application/msword' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    SUPPORTED_ATTACHMENT_EXTENSIONS.test(name.toLowerCase())
  )
}

function buildAttachmentDataUrl(base64: string, mimeType?: string | null) {
  return `data:${mimeType ?? 'application/octet-stream'};base64,${base64}`
}

function sanitizeFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_')
  return cleaned || `upload-${Date.now()}`
}

function bytesToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let output = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0
    const triplet = (a << 16) | (b << 8) | c
    output += chars[(triplet >> 18) & 63]
    output += chars[(triplet >> 12) & 63]
    output += i + 1 < bytes.length ? chars[(triplet >> 6) & 63] : '='
    output += i + 2 < bytes.length ? chars[triplet & 63] : '='
  }
  return output
}

/**
 * Read a picked document as base64.
 *
 * Android DocumentPicker often returns `content://` URIs. Legacy
 * `readAsStringAsync` only supports `file://` (and some SAF URIs), which is why
 * uploads were failing with "Unable to read the selected file".
 */
async function readPickedFileAsBase64(uri: string, fileName: string): Promise<string> {
  const errors: string[] = []

  // 1) Expo SDK 56 File API — supports content:// and file://
  try {
    const base64 = await new File(uri).base64()
    if (base64) return base64
  } catch (err) {
    errors.push(`File.base64: ${err instanceof Error ? err.message : String(err)}`)
  }

  // 2) Copy into app cache as file://, then read with File API / legacy API
  try {
    const uploads = new Directory(Paths.cache, 'uploads')
    if (!uploads.exists) {
      uploads.create()
    }
    const destName = `upload-${Date.now()}-${sanitizeFileName(fileName)}`
    const dest = new File(uploads, destName)
    await new File(uri).copy(dest)
    const base64 = await dest.base64()
    if (base64) return base64
  } catch (err) {
    errors.push(`File.copy: ${err instanceof Error ? err.message : String(err)}`)
  }

  try {
    const dest = `${FileSystem.cacheDirectory ?? ''}upload-${Date.now()}-${sanitizeFileName(fileName)}`
    if (!FileSystem.cacheDirectory) {
      throw new Error('cacheDirectory unavailable')
    }
    await FileSystem.copyAsync({ from: uri, to: dest })
    const base64 = await FileSystem.readAsStringAsync(dest, { encoding: 'base64' })
    if (base64) return base64
  } catch (err) {
    errors.push(`legacy.copy+read: ${err instanceof Error ? err.message : String(err)}`)
  }

  // 3) fetch() — works for some content:// / file:// URIs in RN
  try {
    const response = await fetch(uri)
    const buffer = await response.arrayBuffer()
    const base64 = bytesToBase64(new Uint8Array(buffer))
    if (base64) return base64
  } catch (err) {
    errors.push(`fetch: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (__DEV__) {
    console.warn('[attachments] Failed to read picked file', { uri, fileName, errors })
  }
  throw new Error(errors[0] || 'Unable to read the selected file.')
}

export async function buildUploadAttachment(
  asset: {
    uri: string
    name: string
    mimeType?: string | null
    size?: number | null
  },
  storagePrefix: string,
): Promise<UploadAttachment> {
  if (!asset.uri) {
    throw new Error('Selected file is missing a readable path.')
  }

  const safeName = asset.name || 'attachment'
  const base64 = await readPickedFileAsBase64(asset.uri, safeName)
  const sizeBytes = asset.size ?? 0

  return {
    name: safeName,
    type: inferAttachmentType(safeName, asset.mimeType),
    size: formatAttachmentSize(sizeBytes),
    mimeType: asset.mimeType ?? 'application/octet-stream',
    sizeBytes,
    storageKey: `${storagePrefix}/${Date.now()}-${sanitizeFileName(safeName)}`,
    dataUrl: buildAttachmentDataUrl(base64, asset.mimeType),
  }
}
