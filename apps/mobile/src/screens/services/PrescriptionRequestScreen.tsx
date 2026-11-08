import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
} from 'react-native'
import Pressable from '@/components/Pressable'
import * as DocumentPicker from 'expo-document-picker'
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg'
import { colors, fontWeights, radii, shadows } from '@/theme'
import {
  Screen,
  ScrollArea,
  PageTitle,
  MCard,
  MBtn,
  ActionBar,
} from '@/components'
import { MapPinPicker, type MapPoint } from '@/components/MapPinPicker'
import type { ServicesScreenProps } from '@/navigation/types'
import { buildUploadAttachment, isSupportedPatientAttachment } from '@/lib/attachments'
import { useMobileLocation } from '@/lib/location'
import {
  useCreatePrescriptionRequestMutation,
  useNearbyPharmacies,
  usePatientProfile,
} from '@gg/shared-hooks'
import { useLocationStore, useUserStore } from '@gg/shared-stores'
import type {
  Beneficiary,
  CreatePrescriptionRequestPayload,
  PrescriptionAttachmentPayload,
} from '@gg/shared-types'

function UploadIcon({ size = 18, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 16V4M7 9l5-5 5 5M4 18v1a2 2 0 002 2h12a2 2 0 002-2v-1" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function TruckIcon({ size = 16, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 7h11v8H3zM14 10h3l3 3v2h-6z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={8} cy={18} r={2} stroke={color} strokeWidth={1.5} />
      <Circle cx={18} cy={18} r={2} stroke={color} strokeWidth={1.5} />
    </Svg>
  )
}

function BagIcon({ size = 16, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 8h12l-1 11a2 2 0 01-2 2H9a2 2 0 01-2-2L6 8zM9 8V6a3 3 0 116 0v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ShieldIcon({ size = 16, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  )
}

function getPrescriptionFileLabel(attachment: PrescriptionAttachmentPayload | null) {
  if (!attachment) return 'Upload prescription (PDF or photo)'
  return `${attachment.name} · ${attachment.size}`
}

/**
 * Upload once; the request goes to registered pharmacies near the search point
 * (2 km, then 6 km if none are closer). Quotes come back on the request detail screen.
 */
export function PrescriptionRequestScreen({
  route,
  navigation,
}: ServicesScreenProps<'PrescriptionRequest'>) {
  // Deep links (app/prescriptions/request) arrive without params.
  const sourceAppointmentId = route.params?.sourceAppointmentId
  const { data: profile } = usePatientProfile()
  const user = useUserStore(s => s.user)
  const position = useLocationStore(s => s.position)
  const createPrescription = useCreatePrescriptionRequestMutation()
  // Nothing else starts location for the app, so ask here. It is a no-op once known or denied.
  useMobileLocation()

  const beneficiaries: Beneficiary[] = (profile as any)?.beneficiaries ?? []

  const [forSelf, setForSelf] = useState(true)
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string | null>(null)
  const [fulfillmentMode, setFulfillmentMode] = useState<'pickup' | 'delivery'>('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [pin, setPin] = useState<MapPoint | null>(null)
  const [patientNotes, setPatientNotes] = useState('')
  const [attachment, setAttachment] = useState<PrescriptionAttachmentPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  const delivery = fulfillmentMode === 'delivery'

  const currentPoint = useMemo<MapPoint | null>(
    () => (position ? { lat: position.lat, lng: position.lng } : null),
    [position],
  )
  // Pickup searches from the pin if one was dropped, else from the device location.
  // Delivery only searches from a pin the patient placed at the door.
  const searchPoint = pin ?? (delivery ? null : currentPoint)

  const nearby = useNearbyPharmacies(searchPoint)
  const nearbyData = nearby.data
  const radiusKm = nearbyData?.radiusKm ?? null
  const noPharmacies = !!nearbyData && (radiusKm === null || nearbyData.count === 0)

  let nearbyMessage: string | null = null
  if (searchPoint) {
    if (nearby.isLoading) {
      nearbyMessage = 'Checking for pharmacies nearby...'
    } else if (nearby.isError) {
      nearbyMessage = 'We could not check nearby pharmacies. You can still try to send it.'
    } else if (noPharmacies || radiusKm === null) {
      nearbyMessage = 'No pharmacies available near you'
    } else if (nearbyData) {
      const { count } = nearbyData
      nearbyMessage = `${count} ${count === 1 ? 'pharmacy' : 'pharmacies'} within ${radiusKm} km will get your request`
    }
  }

  const patientLabel = useMemo(() => {
    if (forSelf) return user.name || 'Self'
    return beneficiaries.find(item => item.id === selectedBeneficiary)?.name ?? 'Beneficiary'
  }, [beneficiaries, forSelf, selectedBeneficiary, user.name])

  const pickPrescription = async () => {
    setError(null)
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      copyToCacheDirectory: true,
      multiple: false,
    })

    if (result.canceled || !result.assets?.[0]) {
      return
    }

    const asset = result.assets[0]
    const supported = isSupportedPatientAttachment(asset.name, asset.mimeType)

    if (!supported) {
      setError('Please upload a PDF or image of your prescription.')
      return
    }

    const sizeBytes = asset.size ?? 0
    if (sizeBytes > 8 * 1024 * 1024) {
      setError('File must be 8 MB or smaller.')
      return
    }

    try {
      const nextAttachment = await buildUploadAttachment(asset, 'prescription')
      setAttachment(nextAttachment as PrescriptionAttachmentPayload)
    } catch (err) {
      if (__DEV__) {
        console.warn('[PrescriptionRequest] attachment read failed', {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          message: err instanceof Error ? err.message : String(err),
        })
      }
      setError('Unable to read the selected file. Please try again.')
    }
  }

  const handleSubmit = async () => {
    setError(null)

    if (!attachment) {
      setError('Please upload your prescription before submitting.')
      return
    }

    if (!forSelf && beneficiaries.length > 0 && !selectedBeneficiary) {
      setError('Select a beneficiary before submitting this prescription.')
      return
    }

    if (!searchPoint) {
      setError(
        delivery
          ? 'Drop a pin on the map at the delivery address.'
          : 'Turn on location or drop a pin on the map to find pharmacies near you.',
      )
      return
    }

    if (delivery && deliveryAddress.trim().length < 3) {
      setError('Enter the delivery address, with the house or building number and a landmark.')
      return
    }

    if (noPharmacies) {
      setError('No pharmacies available near you')
      return
    }

    try {
      const payload: CreatePrescriptionRequestPayload = {
        searchLat: searchPoint.lat,
        searchLng: searchPoint.lng,
        forSelf,
        beneficiaryId: forSelf ? undefined : selectedBeneficiary ?? undefined,
        sourceAppointmentId,
        fulfillmentMode,
        deliveryAddress: delivery ? deliveryAddress.trim() : undefined,
        patientNotes: patientNotes.trim() || undefined,
        attachment,
      }

      const result = await createPrescription.mutateAsync(payload)
      navigation.replace('PrescriptionConfirm', {
        referenceId: result.id,
        fulfillmentMode,
        forLabel: patientLabel,
        attachmentName: attachment.name,
        pharmaciesContacted: result.pharmaciesContacted,
        radiusKm: result.searchRadiusKm,
      })
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to submit prescription. Please try again.',
      )
    }
  }

  return (
    <Screen header="modal">
      <ScrollArea gap={16} px={16} py={16}>
        <PageTitle title="Send Prescription" subtitle="Sent to pharmacies near you" />
        <MCard padding={16}>
          <Text style={s.introText}>
            Upload your prescription once. It goes to registered pharmacies within 2 km of you,
            or within 6 km if none are closer. Compare their prices, then choose one.
          </Text>
        </MCard>

        <MCard padding={16}>
          <Text style={s.sectionTitle}>Who is this prescription for?</Text>
          <View style={s.choiceRow}>
            <Pressable
              style={[s.choiceCard, forSelf && s.choiceCardSelected]}
              onPress={() => setForSelf(true)}
            >
              <View style={[s.choiceIconWrap, forSelf && s.choiceIconWrapSelected]}>
                <ShieldIcon size={16} color={forSelf ? '#FFFFFF' : colors.blue} />
              </View>
              <Text style={[s.choiceTitle, forSelf && s.choiceTitleSelected]}>Myself</Text>
              <Text style={[s.choiceBody, forSelf && s.choiceBodySelected]}>
                Use your patient account details
              </Text>
            </Pressable>

            <Pressable
              style={[s.choiceCard, !forSelf && s.choiceCardSelected]}
              onPress={() => setForSelf(false)}
            >
              <View style={[s.choiceIconWrap, !forSelf && s.choiceIconWrapSelected]}>
                <BagIcon size={16} color={!forSelf ? '#FFFFFF' : colors.blue} />
              </View>
              <Text style={[s.choiceTitle, !forSelf && s.choiceTitleSelected]}>
                Beneficiary
              </Text>
              <Text style={[s.choiceBody, !forSelf && s.choiceBodySelected]}>
                Submit for a listed family member
              </Text>
            </Pressable>
          </View>

          {!forSelf && (
            <View style={s.optionList}>
              {beneficiaries.length > 0 ? (
                beneficiaries.map(item => {
                  const selected = selectedBeneficiary === item.id
                  return (
                    <Pressable
                      key={item.id}
                      style={[s.optionCard, selected && s.optionCardSelected]}
                      onPress={() => setSelectedBeneficiary(item.id)}
                    >
                      <View style={[s.optionRadio, selected && s.optionRadioSelected]}>
                        {selected ? <View style={s.optionRadioDot} /> : null}
                      </View>
                      <View style={s.optionTextWrap}>
                        <Text style={[s.optionTitle, selected && s.optionTitleSelected]}>
                          {item.name}
                        </Text>
                        <Text style={s.optionMeta}>{item.relation}</Text>
                      </View>
                    </Pressable>
                  )
                })
              ) : (
                <View style={s.warningBox}>
                  <Text style={s.warningText}>
                    No beneficiaries added yet. Add one from your profile before submitting.
                  </Text>
                </View>
              )}
            </View>
          )}
        </MCard>

        <MCard padding={16}>
          <Text style={s.sectionTitle}>Fulfillment</Text>
          <View style={s.choiceRow}>
            <Pressable
              style={[s.choiceCard, fulfillmentMode === 'pickup' && s.choiceCardSelected]}
              onPress={() => setFulfillmentMode('pickup')}
            >
              <View style={[s.choiceIconWrap, fulfillmentMode === 'pickup' && s.choiceIconWrapSelected]}>
                <BagIcon size={16} color={fulfillmentMode === 'pickup' ? '#FFFFFF' : colors.blue} />
              </View>
              <Text style={[s.choiceTitle, fulfillmentMode === 'pickup' && s.choiceTitleSelected]}>
                Pickup
              </Text>
              <Text style={[s.choiceBody, fulfillmentMode === 'pickup' && s.choiceBodySelected]}>
                Collect medication at the pharmacy
              </Text>
            </Pressable>

            <Pressable
              style={[s.choiceCard, delivery && s.choiceCardSelected]}
              onPress={() => setFulfillmentMode('delivery')}
            >
              <View style={[s.choiceIconWrap, delivery && s.choiceIconWrapSelected]}>
                <TruckIcon size={16} color={delivery ? '#FFFFFF' : colors.blue} />
              </View>
              <Text style={[s.choiceTitle, delivery && s.choiceTitleSelected]}>
                Delivery
              </Text>
              <Text style={[s.choiceBody, delivery && s.choiceBodySelected]}>
                Send medication to your address
              </Text>
            </Pressable>
          </View>

          {delivery && (
            <View style={s.infoBanner}>
              <Text style={s.infoBannerText}>
                Delivery is on credit only. You'll approve the invoice after delivery.
              </Text>
            </View>
          )}
        </MCard>

        <MCard padding={16}>
          <Text style={s.sectionTitle}>{delivery ? 'Delivery location' : 'Search near'}</Text>
          <Text style={s.helperText}>
            {delivery
              ? 'Drop the pin on your door. Pharmacies price the delivery from it.'
              : 'Pharmacies near this pin get your prescription.'}
          </Text>

          <MapPinPicker value={searchPoint} onChange={setPin} center={currentPoint} />

          {nearbyMessage ? (
            <View style={[noPharmacies ? s.warningBox : s.infoBanner, s.nearbyBox]}>
              <Text style={noPharmacies ? s.warningText : s.infoBannerText}>{nearbyMessage}</Text>
            </View>
          ) : null}

          {delivery && (
            <View style={s.textAreaWrap}>
              <Text style={s.fieldLabel}>Delivery address</Text>
              <TextInput
                style={s.textArea}
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                placeholder="House or building number, street, and a landmark"
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          )}
        </MCard>

        <MCard padding={16}>
          <Text style={s.sectionTitle}>Pharmacy Notes</Text>
          <View style={s.textAreaWrapTight}>
            <TextInput
              style={s.textArea}
              value={patientNotes}
              onChangeText={setPatientNotes}
              placeholder="e.g. generic substitute acceptable"
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </MCard>

        <MCard padding={16}>
          <Text style={s.sectionTitle}>Prescription File</Text>
          <Pressable style={[s.uploadBox, attachment && s.uploadBoxActive]} onPress={() => void pickPrescription()}>
            <View style={[s.uploadIconWrap, attachment && s.uploadIconWrapActive]}>
              <UploadIcon size={18} color={attachment ? '#FFFFFF' : colors.blue} />
            </View>
            <View style={s.uploadTextWrap}>
              <Text style={[s.uploadTitle, attachment && s.uploadTitleActive]}>
                {getPrescriptionFileLabel(attachment)}
              </Text>
              <Text style={s.uploadBody}>
                Accepted: PDF, JPG, PNG, WEBP up to 8 MB
              </Text>
            </View>
          </Pressable>

          <View style={s.infoBanner}>
            <ShieldIcon size={18} color={colors.blue} />
            <Text style={s.infoBannerText}>
              Payment is only requested after your medication is prepared for pickup or delivery.
            </Text>
          </View>
        </MCard>

        <View style={{ height: 8 }} />
      </ScrollArea>

      <ActionBar error={error}>
        <MBtn
          variant="secondary"
          style={s.secondaryCta}
          onPress={() => navigation.goBack()}
        >
          Cancel
        </MBtn>
        <MBtn
          variant="primary"
          style={s.primaryCta}
          disabled={createPrescription.isPending || noPharmacies}
          onPress={() => void handleSubmit()}
        >
          {createPrescription.isPending ? 'Sending...' : 'Send Prescription'}
        </MBtn>
      </ActionBar>
    </Screen>
  )
}

export default PrescriptionRequestScreen

const s = StyleSheet.create({
  introText: {
    fontSize: 14.5,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 12,
  },
  helperText: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 19,
    marginTop: -6,
    marginBottom: 12,
  },
  nearbyBox: {
    marginTop: 14,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  choiceCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.large,
    backgroundColor: colors.card,
    padding: 14,
    gap: 8,
  },
  choiceCardSelected: {
    borderColor: colors.blue,
    backgroundColor: colors.blue3,
    ...shadows.card,
  },
  choiceIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.blue3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceIconWrapSelected: {
    backgroundColor: colors.blue,
  },
  choiceTitle: {
    fontSize: 15.5,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  choiceTitleSelected: {
    color: colors.navy,
  },
  choiceBody: {
    fontSize: 13.5,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 20,
  },
  choiceBodySelected: {
    color: colors.textSub,
  },
  optionList: {
    gap: 8,
    marginTop: 14,
  },
  optionCard: {
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
  optionCardSelected: {
    borderColor: colors.blue,
    backgroundColor: colors.blue3,
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: {
    borderColor: colors.blue,
  },
  optionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.blue,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15.5,
    fontFamily: fontWeights.medium,
    color: colors.text,
  },
  optionTitleSelected: {
    fontFamily: fontWeights.bold,
    color: colors.navy,
  },
  optionMeta: {
    fontSize: 12.5,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    marginTop: 2,
  },
  warningBox: {
    backgroundColor: colors.warningBg,
    borderRadius: radii.default,
    padding: 14,
  },
  warningText: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: fontWeights.medium,
    color: colors.warning,
    lineHeight: 20,
  },
  textAreaWrap: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.default,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textAreaWrapTight: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.default,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontFamily: fontWeights.semiBold,
    color: colors.textSub,
    marginBottom: 6,
  },
  textArea: {
    minHeight: 86,
    padding: 0,
    fontSize: 15.5,
    fontFamily: fontWeights.regular,
    color: colors.text,
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.large,
    backgroundColor: colors.bg,
    padding: 16,
  },
  uploadBoxActive: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  uploadIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconWrapActive: {
    backgroundColor: colors.success,
  },
  uploadTextWrap: {
    flex: 1,
    gap: 3,
  },
  uploadTitle: {
    fontSize: 14.5,
    fontFamily: fontWeights.bold,
    color: colors.blueInk,
  },
  uploadTitleActive: {
    color: colors.success,
  },
  uploadBody: {
    fontSize: 12.5,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.blue3,
    borderRadius: radii.default,
    padding: 14,
    marginTop: 14,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: fontWeights.medium,
    color: colors.navy,
    lineHeight: 20,
  },
  secondaryCta: {
    flex: 1,
  },
  primaryCta: {
    flex: 2,
  },
})
