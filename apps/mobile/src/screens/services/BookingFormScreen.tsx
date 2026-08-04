import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg'
import DateTimePicker from '@react-native-community/datetimepicker'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn } from '@/components'
import CalendarIcon from '@/icons/CalendarIcon'
import CheckIcon from '@/icons/CheckIcon'
import type { ServicesScreenProps } from '@/navigation/types'
import { buildUploadAttachment, isSupportedPatientAttachment } from '@/lib/attachments'
import { useProvider, useCreateAppointmentMutation, usePatientProfile } from '@gg/shared-hooks'
import type {
  AppointmentAttachmentPayload,
  CreateAppointmentPayload,
  Provider,
  Beneficiary,
} from '@gg/shared-types'

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '13:00', '13:30', '14:00',
  '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
]

/* ------------------------------------------------------------------ */
/*  Small inline clock icon                                            */
/* ------------------------------------------------------------------ */
function ClockIcon({ size = 18, color = colors.textSub }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
      <Line x1={12} y1={6} x2={12} y2={12} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={12} y1={12} x2={16} y2={14} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

function InfoIcon({ size = 16, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
      <Line x1={12} y1={16} x2={12} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={12} cy={8} r={1} fill={color} />
    </Svg>
  )
}

function UploadIcon({ size = 18, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 16V4M7 9l5-5 5 5M4 18v1a2 2 0 002 2h12a2 2 0 002-2v-1"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function BookingFormScreen({ route, navigation }: ServicesScreenProps<'BookingForm'>) {
  // Deep links (app/booking) may arrive without params — tolerate them.
  const { providerId, rebook } = route.params ?? {}
  const { data: provider, isLoading } = useProvider(providerId)
  const { mutateAsync, isPending } = useCreateAppointmentMutation()

  const { data: profile } = usePatientProfile()
  const beneficiaries: Beneficiary[] = (profile as any)?.beneficiaries ?? []

  /* form state */
  const [bookingFor, setBookingFor] = useState<'self' | 'beneficiary'>(
    rebook?.forSelf === false ? 'beneficiary' : 'self',
  )
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string | null>(
    rebook?.forSelf === false ? rebook.beneficiaryId ?? null : null,
  )
  const [selectedServices, setSelectedServices] = useState<string[]>(
    rebook?.service ? [rebook.service] : [],
  )
  const [notes, setNotes] = useState(rebook?.description ?? '')
  const [attachments, setAttachments] = useState<AppointmentAttachmentPayload[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date(Date.now() + 86400000))
  const [selectedTime, setSelectedTime] = useState('10:00')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!rebook) return
    if (rebook.service) {
      setSelectedServices([rebook.service])
    }
    if (rebook.description) {
      setNotes(rebook.description)
    }
    if (!rebook.forSelf && rebook.beneficiaryId) {
      setBookingFor('beneficiary')
      setSelectedBeneficiary(rebook.beneficiaryId)
    } else {
      setBookingFor('self')
      setSelectedBeneficiary(null)
    }
  }, [rebook])

  if (!providerId) {
    return (
      <Screen>
        <AppBar title="Appointment Request" subtitle="No provider specified" />
        <View style={s.loadingContainer}>
          <Text style={s.loadingText}>
            This booking link did not include a provider. Browse services to
            pick one and start your appointment request.
          </Text>
          <MBtn variant="primary" fullWidth onPress={() => navigation.navigate('FindService')}>
            Browse Services
          </MBtn>
        </View>
      </Screen>
    )
  }

  if (isLoading || !provider) {
    return (
      <Screen>
        <AppBar title="Appointment Request" subtitle="Loading..." />
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={s.loadingText}>Loading provider...</Text>
        </View>
      </Screen>
    )
  }

  const services: string[] = Array.from(
    new Set([
      ...(rebook?.service ? [rebook.service] : []),
      ...((provider as Provider).services ?? [
        'General Consultation',
        'Blood Test',
        'X-Ray',
      ]),
    ]),
  )

  const formatDateISO = (d: Date) => d.toISOString().split('T')[0]
  const formatDisplayDate = (d: Date) =>
    d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
  const formatTime12h = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const suffix = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 || 12
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`
  }

  const handleDateChange = (_event: unknown, date: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false)
    setSelectedDate(date)
  }

  const handleDateDismiss = () => {
    setShowDatePicker(false)
  }

  const toggleService = (service: string) => {
    setSelectedServices(current =>
      current.includes(service)
        ? current.filter(item => item !== service)
        : [...current, service],
    )
  }

  const pickAttachment = async () => {
    setError(null)

    if (attachments.length >= 3) {
      setError('You can upload up to 3 supporting files per appointment request.')
      return
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
      multiple: false,
    })

    if (result.canceled || !result.assets?.[0]) {
      return
    }

    const asset = result.assets[0]
    if (!isSupportedPatientAttachment(asset.name, asset.mimeType)) {
      setError('Please upload a PDF, image, DOC, or DOCX file.')
      return
    }

    const sizeBytes = asset.size ?? 0
    if (sizeBytes > 8 * 1024 * 1024) {
      setError('Each file must be 8 MB or smaller.')
      return
    }

    const duplicate = attachments.some(
      item => item.name === asset.name && item.sizeBytes === sizeBytes,
    )
    if (duplicate) {
      setError('That file has already been attached to this request.')
      return
    }

    try {
      const nextAttachment = await buildUploadAttachment(asset, 'appointment')
      setAttachments(current => [
        ...current,
        nextAttachment as AppointmentAttachmentPayload,
      ])
    } catch (err) {
      if (__DEV__) {
        console.warn('[BookingForm] attachment read failed', {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          message: err instanceof Error ? err.message : String(err),
        })
      }
      setError('Unable to read the selected file. Please try again.')
    }
  }

  const removeAttachment = (storageKey: string) => {
    setAttachments(current => current.filter(item => item.storageKey !== storageKey))
  }

  const handleSubmit = async () => {
    setError(null)
    const forSelf = bookingFor === 'self'
    const normalizedServices =
      selectedServices.length > 0
        ? selectedServices
        : services[0]
          ? [services[0]]
          : []

    if (!forSelf && beneficiaries.length > 0 && !selectedBeneficiary) {
      setError('Select a beneficiary before submitting this appointment request.')
      return
    }

    if (normalizedServices.length === 0) {
      setError('Select at least one service for this appointment request.')
      return
    }

    const payload = {
      providerId: Number(providerId),
      description: notes.trim() || `Appointment request for ${normalizedServices.join(', ')}`,
      date: formatDateISO(selectedDate),
      time: selectedTime,
      forSelf,
      beneficiaryId: forSelf ? undefined : selectedBeneficiary ?? undefined,
      selectedServices: normalizedServices,
      attachments: attachments.length > 0 ? attachments : undefined,
    } as CreateAppointmentPayload

    try {
      const result = await mutateAsync(payload)
      navigation.navigate('BookingConfirm', { result: result as unknown as Record<string, unknown> })
    } catch {
      // error handled by mutation hook
    }
  }

  return (
    <Screen>
      <AppBar
        title="Appointment Request"
        subtitle={`Sending to ${provider.name}`}
      />

      <ScrollArea gap={16} px={16} py={16}>
        {/* === 1. Who is this for === */}
        <View>
          <Text style={s.fieldLabel}>Who is this for?</Text>
          <View style={s.toggleRow}>
            <Pressable
              style={[s.toggleCard, bookingFor === 'self' && s.toggleCardSelected]}
              onPress={() => setBookingFor('self')}
            >
              <View style={[s.toggleRadio, bookingFor === 'self' && s.toggleRadioSelected]}>
                {bookingFor === 'self' && <View style={s.toggleRadioDot} />}
              </View>
              <Text style={[s.toggleText, bookingFor === 'self' && s.toggleTextSelected]}>
                Myself
              </Text>
            </Pressable>

            <Pressable
              style={[s.toggleCard, bookingFor === 'beneficiary' && s.toggleCardSelected]}
              onPress={() => setBookingFor('beneficiary')}
            >
              <View style={[s.toggleRadio, bookingFor === 'beneficiary' && s.toggleRadioSelected]}>
                {bookingFor === 'beneficiary' && <View style={s.toggleRadioDot} />}
              </View>
              <Text style={[s.toggleText, bookingFor === 'beneficiary' && s.toggleTextSelected]}>
                A Beneficiary
              </Text>
            </Pressable>
          </View>
        </View>

        {/* === 1b. Beneficiary Picker (when booking for beneficiary) === */}
        {bookingFor === 'beneficiary' && beneficiaries.length > 0 && (
          <View>
            <Text style={s.fieldLabel}>Select Beneficiary</Text>
            <View style={s.serviceList}>
              {beneficiaries.map((ben: Beneficiary) => {
                const isSelected = selectedBeneficiary === ben.id
                return (
                  <Pressable
                    key={ben.id}
                    style={[s.serviceOption, isSelected && s.serviceOptionSelected]}
                    onPress={() => setSelectedBeneficiary(ben.id)}
                  >
                    <View style={[s.radioCircle, isSelected && s.radioCircleSelected]}>
                      {isSelected && <CheckIcon size={14} color={colors.blue} />}
                    </View>
                    <View>
                      <Text style={[s.serviceOptionText, isSelected && s.serviceOptionTextSelected]}>
                        {ben.name}
                      </Text>
                      <Text style={s.benRelation}>{ben.relation}</Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>
        )}

        {bookingFor === 'beneficiary' && beneficiaries.length === 0 && (
          <View style={s.noBenMsg}>
            <Text style={s.noBenText}>No beneficiaries added yet. Add one in your Profile.</Text>
          </View>
        )}

        {/* === 2. Service Types (locked when rebooking a prior appointment) === */}
        <View>
          <Text style={s.fieldLabel}>
            {rebook?.service ? 'Service' : 'Service Types'}
          </Text>
          {rebook?.service ? (
            <View style={[s.serviceOption, s.serviceOptionSelected, s.serviceOptionLocked]}>
              <View style={[s.radioCircle, s.radioCircleSelected]}>
                <CheckIcon size={14} color={colors.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.serviceOptionText, s.serviceOptionTextSelected]}>
                  {rebook.service}
                </Text>
                <Text style={s.serviceLockedHint}>
                  From your previous appointment — no need to choose again
                </Text>
              </View>
            </View>
          ) : (
            <View style={s.serviceList}>
              {services.map((svc) => {
                const isSelected = selectedServices.includes(svc)
                return (
                  <Pressable
                    key={svc}
                    style={[s.serviceOption, isSelected && s.serviceOptionSelected]}
                    onPress={() => toggleService(svc)}
                  >
                    <View style={[s.radioCircle, isSelected && s.radioCircleSelected]}>
                      {isSelected && <CheckIcon size={14} color={colors.blue} />}
                    </View>
                    <Text style={[s.serviceOptionText, isSelected && s.serviceOptionTextSelected]}>
                      {svc}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          )}
        </View>

        {/* === 3. Date === */}
        <View>
          <Text style={s.fieldLabel}>Preferred Date</Text>
          <Pressable style={s.dateField} onPress={() => setShowDatePicker(true)}>
            <CalendarIcon size={18} color={colors.textSub} />
            <Text style={s.dateFieldText}>{formatDisplayDate(selectedDate)}</Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onValueChange={handleDateChange}
              onDismiss={handleDateDismiss}
            />
          )}
        </View>

        {/* === 3b. Time Slot === */}
        <View>
          <Text style={s.fieldLabel}>Preferred Time</Text>
          <View style={s.timeSlotGrid}>
            {TIME_SLOTS.map(slot => {
              const isSelected = selectedTime === slot
              return (
                <Pressable
                  key={slot}
                  style={[s.timeSlot, isSelected && s.timeSlotSelected]}
                  onPress={() => setSelectedTime(slot)}
                >
                  <Text style={[s.timeSlotText, isSelected && s.timeSlotTextSelected]}>
                    {formatTime12h(slot)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* === 4. Additional Notes === */}
        <View>
          <Text style={s.fieldLabel}>Additional Notes</Text>
          <View style={s.textAreaWrap}>
            <TextInput
              style={s.textArea}
              value={notes}
              onChangeText={setNotes}
              placeholder="Briefly describe your healthcare needs..."
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View>
          <Text style={s.fieldLabel}>Supporting Files (Optional)</Text>
          <Pressable style={s.uploadBox} onPress={() => void pickAttachment()}>
            <View style={s.uploadIconWrap}>
              <UploadIcon size={18} color={colors.blue} />
            </View>
            <View style={s.uploadBody}>
              <Text style={s.uploadTitle}>Add referral or supporting document</Text>
              <Text style={s.uploadSubtitle}>
                PDF, JPG, PNG, DOC, or DOCX up to 8 MB each. Maximum 3 files.
              </Text>
            </View>
            <Text style={s.uploadCta}>Upload</Text>
          </Pressable>

          {attachments.length > 0 ? (
            <View style={s.attachmentList}>
              {attachments.map(item => (
                <View key={item.storageKey} style={s.attachmentRow}>
                  <View style={s.attachmentMeta}>
                    <Text style={s.attachmentName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={s.attachmentSize}>
                      {item.size} - {item.type.toUpperCase()}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => removeAttachment(item.storageKey)}
                    hitSlop={6}
                  >
                    <Text style={s.attachmentRemove}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        {/* === 5. Info Notice === */}
        <View style={s.infoBanner}>
          <InfoIcon size={18} color={colors.blue} />
          <Text style={s.infoBannerText}>
            What happens next: Your request goes to {provider.name}. You'll be notified once confirmed.
          </Text>
        </View>

        {/* === 6. Buttons === */}
        <View style={s.buttonRow}>
          <MBtn
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={s.cancelBtn}
          >
            Cancel
          </MBtn>
          <MBtn
            variant="primary"
            disabled={isPending}
            onPress={handleSubmit}
            style={s.submitBtn}
          >
            {isPending ? 'Submitting...' : 'Submit Request ->'}
          </MBtn>
        </View>

        {/* bottom spacer */}
        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

export default BookingFormScreen

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */
const s = StyleSheet.create({
  /* loading */
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
  },

  /* field label */
  fieldLabel: {
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 10,
  },

  /* who is this for */
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.default,
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  toggleCardSelected: {
    borderColor: colors.blue,
    backgroundColor: colors.blue3,
  },
  toggleRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRadioSelected: {
    borderColor: colors.blue,
  },
  toggleRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.blue,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: fontWeights.semiBold,
    color: colors.textSub,
  },
  toggleTextSelected: {
    color: colors.navy,
  },

  /* service type */
  serviceList: {
    gap: 8,
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.default,
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  serviceOptionSelected: {
    borderColor: colors.blue,
    backgroundColor: colors.blue3,
  },
  serviceOptionLocked: {
    alignItems: 'flex-start',
  },
  serviceLockedHint: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 16,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  radioCircleSelected: {
    borderColor: colors.blue,
    backgroundColor: colors.blue3,
  },
  serviceOptionText: {
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: colors.text,
  },
  serviceOptionTextSelected: {
    fontFamily: fontWeights.semiBold,
    color: colors.navy,
  },

  benRelation: {
    fontSize: 11,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    marginTop: 1,
  },
  noBenMsg: {
    backgroundColor: colors.warningBg,
    borderRadius: radii.default,
    padding: 14,
  },
  noBenText: {
    fontSize: 12,
    fontFamily: fontWeights.medium,
    color: colors.warning,
    lineHeight: 18,
  },

  /* date & time */
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.default,
    backgroundColor: colors.card,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  dateFieldText: {
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: colors.text,
  },

  /* time slots */
  timeSlotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  timeSlotSelected: {
    borderColor: colors.blue,
    backgroundColor: colors.blue3,
  },
  timeSlotText: {
    fontSize: 13,
    fontFamily: fontWeights.medium,
    color: colors.text,
  },
  timeSlotTextSelected: {
    fontFamily: fontWeights.bold,
    color: colors.blue,
  },

  /* notes */
  textAreaWrap: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.default,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textArea: {
    fontSize: 14,
    fontFamily: fontWeights.regular,
    color: colors.text,
    minHeight: 90,
    padding: 0,
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.default,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  uploadIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBody: {
    flex: 1,
    gap: 2,
  },
  uploadTitle: {
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  uploadSubtitle: {
    fontSize: 11,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 17,
  },
  uploadCta: {
    fontSize: 12,
    fontFamily: fontWeights.bold,
    color: colors.blue,
  },
  attachmentList: {
    gap: 8,
    marginTop: 10,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.default,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  attachmentMeta: {
    flex: 1,
    gap: 2,
  },
  attachmentName: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: colors.text,
  },
  attachmentSize: {
    fontSize: 11,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
  },
  attachmentRemove: {
    fontSize: 12,
    fontFamily: fontWeights.bold,
    color: colors.error,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fontWeights.medium,
    color: colors.error,
    textAlign: 'center',
  },

  /* info banner */
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.blue3,
    borderRadius: radii.default,
    padding: 14,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fontWeights.medium,
    color: colors.navy,
    lineHeight: 18,
  },

  /* buttons */
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
})
