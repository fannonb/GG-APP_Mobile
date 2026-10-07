import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import Pressable from '@/components/Pressable'
import * as DocumentPicker from 'expo-document-picker'
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg'
import { colors, fontWeights, radii, shadows } from '@/theme'
import {
  Screen,
  ScrollArea,
  AppBar,
  MCard,
  MBtn,
  MAvatar,
  GGPill,
  ActionBar,
} from '@/components'
import type { ServicesScreenProps } from '@/navigation/types'
import { buildUploadAttachment, isSupportedPatientAttachment } from '@/lib/attachments'
import {
  useCreatePrescriptionRequestMutation,
  usePatientProfile,
  useProvider,
} from '@gg/shared-hooks'
import { useUserStore } from '@gg/shared-stores'
import type {
  Beneficiary,
  CreatePrescriptionRequestPayload,
  PrescriptionAttachmentPayload,
  Provider,
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

export function PrescriptionRequestScreen({
  route,
  navigation,
}: ServicesScreenProps<'PrescriptionRequest'>) {
  // Deep links (app/prescriptions/request) may arrive without params.
  const { providerId } = route.params ?? {}
  const { data: provider, isLoading } = useProvider(providerId)
  const { data: profile } = usePatientProfile()
  const user = useUserStore(s => s.user)
  const createPrescription = useCreatePrescriptionRequestMutation()

  const beneficiaries: Beneficiary[] = (profile as any)?.beneficiaries ?? []
  const p = provider as Provider | undefined

  const [forSelf, setForSelf] = useState(true)
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string | null>(null)
  const [fulfillmentMode, setFulfillmentMode] = useState<'pickup' | 'delivery'>('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [patientNotes, setPatientNotes] = useState('')
  const [attachment, setAttachment] = useState<PrescriptionAttachmentPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

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

    if (fulfillmentMode === 'delivery' && !deliveryAddress.trim()) {
      setError('Please enter a delivery address.')
      return
    }

    if (!p) {
      setError('Provider details are unavailable. Please try again.')
      return
    }

    try {
      const payload: CreatePrescriptionRequestPayload = {
        providerId: Number(providerId),
        forSelf,
        beneficiaryId: forSelf ? undefined : selectedBeneficiary ?? undefined,
        fulfillmentMode,
        deliveryAddress: fulfillmentMode === 'delivery' ? deliveryAddress.trim() : undefined,
        patientNotes: patientNotes.trim() || undefined,
        attachment,
      }

      const result = await createPrescription.mutateAsync(payload)
      navigation.replace('PrescriptionConfirm', {
        referenceId: result.id,
        provider: p.name,
        fulfillmentMode,
        forLabel: patientLabel,
        attachmentName: attachment.name,
      })
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to submit prescription. Please try again.',
      )
    }
  }

  if (!providerId) {
    return (
      <Screen>
        <AppBar title="Upload Prescription" subtitle="No pharmacy specified" />
        <View style={s.loadingWrap}>
          <Text style={s.loadingText}>
            This prescription link did not include a pharmacy. Browse services
            to pick one and upload your prescription.
          </Text>
          <MBtn variant="primary" fullWidth onPress={() => navigation.navigate('FindService')}>
            Browse Services
          </MBtn>
        </View>
      </Screen>
    )
  }

  if (isLoading || !p) {
    return (
      <Screen>
        <AppBar title="Upload Prescription" subtitle="Loading provider..." />
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={s.loadingText}>Loading provider...</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <AppBar title="Upload Prescription" subtitle={`Sending to ${p.name}`} />

      <ScrollArea gap={16} px={16} py={16}>
        <MCard padding={16}>
          <View style={s.providerHeader}>
            <MAvatar name={p.name} size={54} bg={colors.navy} />
            <View style={s.providerHeaderInfo}>
              <Text style={s.providerName}>{p.name}</Text>
              <Text style={s.providerMeta}>Pharmacy · {p.address}</Text>
              <View style={s.providerPills}>
                <GGPill type={p.status === 'open' ? 'open' : 'closed'}>
                  {p.status === 'open' ? 'Open' : 'Closed'}
                </GGPill>
                <GGPill type="info">Verified</GGPill>
              </View>
            </View>
          </View>

          <Text style={s.introText}>
            Upload your prescription from a recent consultation. {p.name} will review it,
            confirm stock and pricing, then prepare your order for pickup or delivery.
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
              style={[s.choiceCard, fulfillmentMode === 'delivery' && s.choiceCardSelected]}
              onPress={() => setFulfillmentMode('delivery')}
            >
              <View style={[s.choiceIconWrap, fulfillmentMode === 'delivery' && s.choiceIconWrapSelected]}>
                <TruckIcon size={16} color={fulfillmentMode === 'delivery' ? '#FFFFFF' : colors.blue} />
              </View>
              <Text style={[s.choiceTitle, fulfillmentMode === 'delivery' && s.choiceTitleSelected]}>
                Delivery
              </Text>
              <Text style={[s.choiceBody, fulfillmentMode === 'delivery' && s.choiceBodySelected]}>
                Send medication to your address
              </Text>
            </Pressable>
          </View>

          {fulfillmentMode === 'delivery' && (
            <View style={s.textAreaWrap}>
              <Text style={s.fieldLabel}>Delivery Address</Text>
              <TextInput
                style={s.textArea}
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                placeholder="Street, suburb, city"
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
          disabled={createPrescription.isPending}
          onPress={() => void handleSubmit()}
        >
          {createPrescription.isPending ? 'Submitting...' : 'Submit Prescription'}
        </MBtn>
      </ActionBar>
    </Screen>
  )
}

export default PrescriptionRequestScreen

const s = StyleSheet.create({
  loadingWrap: {
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
  providerHeader: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  providerHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  providerName: {
    fontSize: 16,
    fontFamily: fontWeights.extraBold,
    color: colors.text,
  },
  providerMeta: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
  },
  providerPills: {
    flexDirection: 'row',
    gap: 6,
  },
  introText: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 12,
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
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  choiceTitleSelected: {
    color: colors.navy,
  },
  choiceBody: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 18,
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
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: colors.text,
  },
  optionTitleSelected: {
    fontFamily: fontWeights.bold,
    color: colors.navy,
  },
  optionMeta: {
    fontSize: 11,
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
    fontSize: 12,
    fontFamily: fontWeights.medium,
    color: colors.warning,
    lineHeight: 18,
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
    fontSize: 11,
    fontFamily: fontWeights.semiBold,
    color: colors.textSub,
    marginBottom: 6,
  },
  textArea: {
    minHeight: 86,
    padding: 0,
    fontSize: 14,
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
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: colors.blueInk,
  },
  uploadTitleActive: {
    color: colors.success,
  },
  uploadBody: {
    fontSize: 11,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 16,
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
    fontSize: 12,
    fontFamily: fontWeights.medium,
    color: colors.navy,
    lineHeight: 18,
  },
  secondaryCta: {
    flex: 1,
  },
  primaryCta: {
    flex: 2,
  },
})
