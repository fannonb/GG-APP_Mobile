import React from 'react'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { colors } from '@/theme'

/**
 * Duotone care-category icons: a 1.8px outline over a soft fill of the same
 * colour. Drawn on a 32 grid so they read clearly at the
 * 26–30px they're shown at, unlike the generic 22px line glyphs they replace.
 */
interface IconProps {
  size?: number
  color: string
}

const STROKE = {
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}
const FILL_OPACITY = 0.22

function PharmacyCategoryIcon({ size = 28, color }: IconProps) {
  // A capsule, half filled, and a scored tablet.
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M7.6 17.4l7-7a4.6 4.6 0 0 1 6.5 6.5l-3.5 3.5-6.5-6.5"
        fill={color}
        fillOpacity={FILL_OPACITY}
      />
      <Path
        d="M7.6 17.4l7-7a4.6 4.6 0 0 1 6.5 6.5l-7 7a4.6 4.6 0 0 1-6.5-6.5zM11.1 13.9l6.5 6.5"
        stroke={color}
        {...STROKE}
      />
      <Circle cx={23.5} cy={23.5} r={3.8} fill={color} fillOpacity={FILL_OPACITY} stroke={color} {...STROKE} />
      <Path d="M20.9 26.1l5.2-5.2" stroke={color} {...STROKE} />
    </Svg>
  )
}

function LaboratoryCategoryIcon({ size = 28, color }: IconProps) {
  // A flask with liquid and a bubble.
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M9.6 19.5h12.8l3 4.7a1.8 1.8 0 0 1-1.5 2.8H8.1a1.8 1.8 0 0 1-1.5-2.8z"
        fill={color}
        fillOpacity={FILL_OPACITY}
      />
      <Path
        d="M12 5h8M13.5 5v7.6L6.6 24.2A1.8 1.8 0 0 0 8.1 27h15.8a1.8 1.8 0 0 0 1.5-2.8l-6.9-11.6V5M9.8 19.5h12.4"
        stroke={color}
        {...STROKE}
      />
      <Circle cx={14.5} cy={23} r={1.2} fill={color} />
      <Circle cx={18.5} cy={22.2} r={0.9} fill={color} />
    </Svg>
  )
}

function DoctorCategoryIcon({ size = 28, color }: IconProps) {
  // A stethoscope.
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M8 5H6.5v6.5a6 6 0 0 0 12 0V5H17M12.5 17.5v2a6.5 6.5 0 0 0 13 0v-1.7"
        stroke={color}
        {...STROKE}
      />
      <Circle cx={25.5} cy={14.8} r={3} fill={color} fillOpacity={FILL_OPACITY} stroke={color} {...STROKE} />
      <Circle cx={25.5} cy={14.8} r={0.9} fill={color} />
    </Svg>
  )
}

function RadiologyCategoryIcon({ size = 28, color }: IconProps) {
  // An X-ray film: spine and ribs inside a frame.
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Rect x={5} y={5} width={22} height={22} rx={4.5} fill={color} fillOpacity={FILL_OPACITY} stroke={color} {...STROKE} />
      <Path
        d="M16 9v14M16 12.2c-2.2 0-4.2.6-5.6 1.8M16 12.2c2.2 0 4.2.6 5.6 1.8M16 16c-2.2 0-4.2.6-5.6 1.8M16 16c2.2 0 4.2.6 5.6 1.8M16 19.8c-1.8 0-3.4.5-4.6 1.4M16 19.8c1.8 0 3.4.5 4.6 1.4"
        stroke={color}
        {...STROKE}
      />
    </Svg>
  )
}

function HospitalCategoryIcon({ size = 28, color }: IconProps) {
  // A building with a cross and a door.
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M7 27V13.5A1.5 1.5 0 0 1 8.5 12H11V6.5A1.5 1.5 0 0 1 12.5 5h7A1.5 1.5 0 0 1 21 6.5V12h2.5a1.5 1.5 0 0 1 1.5 1.5V27z"
        fill={color}
        fillOpacity={FILL_OPACITY}
      />
      <Path
        d="M4.5 27h23M7 27V13.5A1.5 1.5 0 0 1 8.5 12H11M25 27V13.5a1.5 1.5 0 0 0-1.5-1.5H21M11 27V6.5A1.5 1.5 0 0 1 12.5 5h7A1.5 1.5 0 0 1 21 6.5V27M16 8.2v5M13.5 10.7h5M14 27v-4.5a2 2 0 0 1 4 0V27"
        stroke={color}
        {...STROKE}
      />
    </Svg>
  )
}

function ClinicCategoryIcon({ size = 28, color }: IconProps) {
  // A heart with a pulse line: everyday check-ups and wellness.
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M16 26.5S5 20.3 5 12.8A5.6 5.6 0 0 1 16 10a5.6 5.6 0 0 1 11 2.8c0 7.5-11 13.7-11 13.7z"
        fill={color}
        fillOpacity={FILL_OPACITY}
        stroke={color}
        {...STROKE}
      />
      <Path d="M8.5 16.5h4l1.8-3 3 6 1.9-3h4.3" stroke={color} {...STROKE} />
    </Svg>
  )
}

function GlobalCategoryIcon({ size = 28, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Circle cx={16} cy={16} r={11} fill={color} fillOpacity={FILL_OPACITY} stroke={color} {...STROKE} />
      <Path
        d="M5 16h22M16 5c3 3 4.4 6.7 4.4 11S19 24 16 27M16 5c-3 3-4.4 6.7-4.4 11S13 24 16 27"
        stroke={color}
        {...STROKE}
      />
    </Svg>
  )
}

/**
 * Icon and short descriptor for each care category. Every category shares the
 * brand's blue ink on a pale blue tile: the shapes tell them apart, so the
 * colour stays one calm accent instead of six competing ones.
 */
const INK = colors.blueInk
const TINT = colors.blue100
export const CARE_CATEGORY_STYLE: Record<
  string,
  { Icon: React.ComponentType<IconProps>; ink: string; tint: string; short: string }
> = {
  pharmacy: { Icon: PharmacyCategoryIcon, ink: INK, tint: TINT, short: 'Medicines' },
  laboratory: { Icon: LaboratoryCategoryIcon, ink: INK, tint: TINT, short: 'Lab tests' },
  doctor: { Icon: DoctorCategoryIcon, ink: INK, tint: TINT, short: 'Consultations' },
  radiology: { Icon: RadiologyCategoryIcon, ink: INK, tint: TINT, short: 'Scans & X-ray' },
  hospital: { Icon: HospitalCategoryIcon, ink: INK, tint: TINT, short: 'Inpatient care' },
  clinic: { Icon: ClinicCategoryIcon, ink: INK, tint: TINT, short: 'Check-ups' },
  global_specialists: { Icon: GlobalCategoryIcon, ink: INK, tint: TINT, short: 'Abroad' },
}

export function CareCategoryIcon({ id, size = 28, color }: { id: string; size?: number; color?: string }) {
  const style = CARE_CATEGORY_STYLE[id] ?? CARE_CATEGORY_STYLE.doctor
  const { Icon } = style
  return <Icon size={size} color={color ?? style.ink} />
}
