import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

/** Edge length of the square photo that is uploaded, in pixels. */
export const PROFILE_PHOTO_SIZE = 512
/** JPEG quality for the upload, from 0 to 1. */
const JPEG_QUALITY = 0.85
const UNREADABLE_MESSAGE = 'Could not read this photo. Try a different one.'

export type ProfilePhotoPayload = { dataUrl: string; mimeType: 'image/jpeg' }

/**
 * Opens the system photo library and returns the chosen photo as a 512x512 JPEG
 * data URL, or null if the patient cancels. The system picker needs no
 * media-library permission on this SDK, so none is requested.
 */
export async function pickProfilePhoto(): Promise<ProfilePhotoPayload | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  })
  if (result.canceled) return null
  const asset = result.assets[0]
  if (!asset) return null
  return toSquareJpeg(asset.uri, asset.width, asset.height)
}

/** Reads the decoded size of an image, with EXIF orientation already applied. */
async function readDecodedSize(uri: string): Promise<{ width: number; height: number }> {
  const context = ImageManipulator.manipulate(uri)
  const image = await context.renderAsync()
  const size = { width: image.width, height: image.height }
  image.release()
  context.release()
  return size
}

/**
 * Centre-crops to a square, resizes to 512x512 and encodes as JPEG. Re-encoding
 * drops EXIF data (location, camera), which is intended.
 */
async function toSquareJpeg(
  uri: string,
  pickedWidth: number,
  pickedHeight: number,
): Promise<ProfilePhotoPayload> {
  // The picker's size can be 0 or ignore EXIF rotation, so only a square size from the
  // picker is trusted. Anything else is re-read from the decoded image, which is the
  // same coordinate space the crop uses.
  const size =
    pickedWidth > 0 && pickedWidth === pickedHeight
      ? { width: pickedWidth, height: pickedHeight }
      : await readDecodedSize(uri)
  const side = Math.min(size.width, size.height)
  if (side <= 0) throw new Error(UNREADABLE_MESSAGE)

  const context = ImageManipulator.manipulate(uri)
    .crop({
      originX: Math.floor((size.width - side) / 2),
      originY: Math.floor((size.height - side) / 2),
      width: side,
      height: side,
    })
    .resize({ width: PROFILE_PHOTO_SIZE, height: PROFILE_PHOTO_SIZE })
  const image = await context.renderAsync()
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: JPEG_QUALITY,
    base64: true,
  })
  image.release()
  context.release()

  if (!saved.base64) throw new Error(UNREADABLE_MESSAGE)
  return { dataUrl: `data:image/jpeg;base64,${saved.base64}`, mimeType: 'image/jpeg' }
}
