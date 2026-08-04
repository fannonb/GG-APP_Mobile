import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native'
import Svg, { Path, Circle, Line } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import { colors, fontWeights, radii, shadows } from '@/theme'
import {
  Screen,
  ScrollArea,
  AppBar,
  MCard,
  MBtn,
  MAvatar,
  GGPill,
  Field,
  DateField,
} from '@/components'
import {
  usePatientProfile,
  useAddBeneficiaryMutation,
  useUpdateBeneficiaryMutation,
  useDeleteBeneficiaryMutation,
  useSetBeneficiariesEnabledMutation,
} from '@gg/shared-hooks'
import { useUserStore } from '@gg/shared-stores'
import { isBeneficiariesActive } from '@gg/shared-utils'
import { getCountryByCode, OPERATING_COUNTRY_OPTIONS } from '@gg/shared-config'
import type { Beneficiary } from '@gg/shared-types'
import type { CountryCode } from '@gg/shared-config'
import { formatDobForDisplay, normalizeDobInput } from '@/lib/dates'

/* ------------------------------------------------------------------ */
/*  Relationship options                                               */
/* ------------------------------------------------------------------ */
const RELATION_OPTIONS = [
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Child', label: 'Child' },
  { value: 'Parent', label: 'Parent' },
  { value: 'Sibling', label: 'Sibling' },
  { value: 'Other', label: 'Other' },
]

/* ------------------------------------------------------------------ */
/*  Inline SVG icons                                                   */
/* ------------------------------------------------------------------ */
function InfoIcon({ size = 18, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
      <Line x1={12} y1={16} x2={12} y2={12} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={12} cy={8} r={0.5} fill={color} stroke={color} strokeWidth={1} />
    </Svg>
  )
}

function PersonPlusIcon({ size = 24, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={10} cy={8} r={4} stroke={color} strokeWidth={1.5} />
      <Path
        d="M2 20c0-4 3.6-7 8-7s8 3 8 7"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Line x1={20} y1={8} x2={20} y2={14} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={17} y1={11} x2={23} y2={11} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

function ChevronDown() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M4 6l4 4 4-4"
        stroke={colors.textLight}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function EditIcon({ size = 16, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function TrashIcon({ size = 16, color = colors.error }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Empty form                                                         */
/* ------------------------------------------------------------------ */
const EMPTY_FORM = {
  name: '',
  relation: '',
  dob: '',
  nationalId: '',
  countryCode: 'KE' as CountryCode,
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function BeneficiariesScreen() {
  const navigation = useNavigation<any>()
  const storedUser = useUserStore(s => s.user)
  const storedBeneficiaries = useUserStore(s => s.beneficiaries)
  const { data: profile, isLoading } = usePatientProfile()
  const addMutation = useAddBeneficiaryMutation()
  const updateMutation = useUpdateBeneficiaryMutation()
  const deleteMutation = useDeleteBeneficiaryMutation()
  const setBeneficiariesEnabled = useSetBeneficiariesEnabledMutation()

  const user = profile?.user ?? storedUser
  const beneficiaries: Beneficiary[] =
    profile?.beneficiaries ?? storedBeneficiaries ?? []
  const beneficiariesActive = isBeneficiariesActive(
    user?.beneficiariesEnabled,
    beneficiaries.length,
  )

  /* form state */
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingBen, setEditingBen] = useState<Beneficiary | null>(null)
  const [deletingBen, setDeletingBen] = useState<Beneficiary | null>(null)
  const [benForm, setBenForm] = useState(EMPTY_FORM)
  const [showRelationPicker, setShowRelationPicker] = useState(false)
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const resetForm = () => {
    setBenForm(EMPTY_FORM)
    setShowAddForm(false)
    setEditingBen(null)
    setFormError(null)
    setShowRelationPicker(false)
    setShowCountryPicker(false)
  }

  const openAddForm = () => {
    setEditingBen(null)
    setDeletingBen(null)
    setBenForm({
      ...EMPTY_FORM,
      countryCode: (user?.countryCode ?? 'KE') as CountryCode,
    })
    setFormError(null)
    setShowAddForm(true)
  }

  const openEditForm = (ben: Beneficiary) => {
    setShowAddForm(false)
    setDeletingBen(null)
    setBenForm({
      name: ben.name ?? '',
      relation: ben.relation ?? '',
      dob: ben.dob ? formatDobForDisplay(ben.dob) : '',
      nationalId: ben.nationalId ?? '',
      countryCode: (ben.countryCode ?? user?.countryCode ?? 'KE') as CountryCode,
    })
    setFormError(null)
    setEditingBen(ben)
  }

  const handleSubmitForm = async () => {
    if (!benForm.name.trim()) {
      setFormError('Full name is required')
      return
    }
    if (!benForm.relation) {
      setFormError('Relationship is required')
      return
    }
    if (!benForm.countryCode) {
      setFormError('Country of residence is required')
      return
    }
    if (!benForm.dob.trim()) {
      setFormError('Date of birth is required')
      return
    }
    const normalizedDob = normalizeDobInput(benForm.dob)
    if (!normalizedDob) {
      setFormError('Use a valid date of birth in DD/MM/YYYY format.')
      return
    }

    setFormError(null)
    setFormLoading(true)

    try {
      const payload = {
        name: benForm.name.trim(),
        relation: benForm.relation,
        dob: normalizedDob,
        nationalId: benForm.nationalId.trim() || undefined,
        countryCode: benForm.countryCode,
      }

      if (editingBen) {
        await updateMutation.mutateAsync({ id: editingBen.id, payload })
      } else {
        await addMutation.mutateAsync(payload)
      }
      resetForm()
    } catch (err: any) {
      setFormError(
        err?.message ?? (editingBen ? 'Failed to update beneficiary' : 'Failed to add beneficiary'),
      )
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (ben: Beneficiary) => {
    setDeleteLoading(true)
    try {
      await deleteMutation.mutateAsync(ben.id)
      setDeletingBen(null)
    } catch (err: any) {
      setFormError(err?.message ?? 'Failed to remove beneficiary')
    } finally {
      setDeleteLoading(false)
    }
  }

  const selectedRelation = RELATION_OPTIONS.find(r => r.value === benForm.relation)
  const selectedCountry = OPERATING_COUNTRY_OPTIONS.find(c => c.value === benForm.countryCode)
  const isFormOpen = showAddForm || editingBen != null

  /* loading */
  if (isLoading && beneficiaries.length === 0 && !profile) {
    return (
      <Screen>
        <AppBar
          title="Beneficiaries"
          subtitle="Manage covered family members"
        />
        <View style={s.loadWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={s.loadText}>Loading beneficiaries...</Text>
        </View>
      </Screen>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Beneficiary Form (shared for Add & Edit)                         */
  /* ---------------------------------------------------------------- */
  const renderForm = () => (
    <MCard padding={18}>
      <Text style={s.formTitle}>
        {editingBen ? `Edit ${editingBen.name}` : 'Add New Beneficiary'}
      </Text>
      <Text style={s.formSubtitle}>
        {editingBen
          ? 'Update the details for this beneficiary.'
          : 'Provide details for the new beneficiary.'}
      </Text>

      {/* Full Name */}
      <Field
        label="Full Name"
        placeholder="Enter beneficiary's full name"
        value={benForm.name}
        onChangeText={(v: string) => setBenForm(p => ({ ...p, name: v }))}
        required
      />

      {/* Relationship (dropdown) */}
      <View style={{ marginBottom: 12 }}>
        <View style={s.labelRow}>
          <Text style={s.fieldLabel}>Relationship</Text>
          <Text style={s.asterisk}> *</Text>
        </View>
        <Pressable
          style={s.dropdownBtn}
          onPress={() => setShowRelationPicker(!showRelationPicker)}
        >
          <Text
            style={[
              s.dropdownText,
              !benForm.relation && { color: colors.textLight },
            ]}
            numberOfLines={1}
          >
            {selectedRelation?.label ?? 'Select relationship'}
          </Text>
          <ChevronDown />
        </Pressable>

        {showRelationPicker && (
          <View style={s.dropdownList}>
            {RELATION_OPTIONS.map(opt => (
              <Pressable
                key={opt.value}
                style={[
                  s.dropdownOption,
                  benForm.relation === opt.value && { backgroundColor: colors.blue3 },
                ]}
                onPress={() => {
                  setBenForm(p => ({ ...p, relation: opt.value }))
                  setShowRelationPicker(false)
                }}
              >
                <Text
                  style={[
                    s.dropdownOptionText,
                    benForm.relation === opt.value && {
                      color: colors.blue,
                      fontFamily: fontWeights.bold,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={{ marginBottom: 12 }}>
        <View style={s.labelRow}>
          <Text style={s.fieldLabel}>Country of Residence</Text>
          <Text style={s.asterisk}> *</Text>
        </View>
        <Pressable
          style={s.dropdownBtn}
          onPress={() => setShowCountryPicker(!showCountryPicker)}
        >
          <Text
            style={[
              s.dropdownText,
              !benForm.countryCode && { color: colors.textLight },
            ]}
            numberOfLines={1}
          >
            {selectedCountry?.label ?? 'Select country'}
          </Text>
          <ChevronDown />
        </Pressable>

        {showCountryPicker && (
          <View style={s.dropdownList}>
            {OPERATING_COUNTRY_OPTIONS.map(opt => (
              <Pressable
                key={opt.value}
                style={[
                  s.dropdownOption,
                  benForm.countryCode === opt.value && { backgroundColor: colors.blue3 },
                ]}
                onPress={() => {
                  setBenForm(p => ({ ...p, countryCode: opt.value }))
                  setShowCountryPicker(false)
                }}
              >
                <Text
                  style={[
                    s.dropdownOptionText,
                    benForm.countryCode === opt.value && {
                      color: colors.blue,
                      fontFamily: fontWeights.bold,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Date of Birth */}
      <DateField
        label="Date of Birth"
        value={benForm.dob}
        onChangeText={(v: string) => setBenForm(p => ({ ...p, dob: v }))}
        required
      />

      {/* National ID (optional) */}
      <Field
        label="National ID"
        placeholder="Optional"
        value={benForm.nationalId}
        onChangeText={(v: string) => setBenForm(p => ({ ...p, nationalId: v }))}
      />

      {formError && <Text style={s.errorText}>{formError}</Text>}

      <View style={s.formBtnRow}>
        <MBtn variant="secondary" style={{ flex: 1 }} onPress={resetForm}>
          Cancel
        </MBtn>
        <MBtn
          variant="primary"
          style={{ flex: 2 }}
          disabled={formLoading}
          onPress={handleSubmitForm}
        >
          {formLoading
            ? 'Saving...'
            : editingBen
            ? 'Update Beneficiary'
            : 'Add Beneficiary'}
        </MBtn>
      </View>
    </MCard>
  )

  return (
    <Screen>
      <AppBar
        title="Beneficiaries"
        subtitle="Manage covered family members"
      />

      <ScrollArea gap={14} px={16} py={14}>
        {/* ============================================================ */}
        {/*  1. Info Notice                                              */}
        {/* ============================================================ */}
        <View style={s.infoNotice}>
          <InfoIcon size={18} color={colors.blue} />
          <Text style={s.infoText}>
            Appointments for beneficiaries are billed to your credit account
            with clear attribution.
          </Text>
        </View>

        <MCard padding={16}>
          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleTitle}>Beneficiaries</Text>
              <Text style={s.toggleSub}>
                {beneficiariesActive
                  ? 'Manage the people you can book appointments and pay for.'
                  : 'Turn this on to add family members and book healthcare for them.'}
              </Text>
            </View>
            <Switch
              value={beneficiariesActive}
              onValueChange={(enabled) => {
                if (beneficiariesActive && beneficiaries.length > 0) return
                setBeneficiariesEnabled.mutate(enabled)
              }}
              disabled={setBeneficiariesEnabled.isPending || beneficiaries.length > 0}
              trackColor={{ false: colors.border, true: colors.blue }}
              thumbColor="#FFFFFF"
            />
          </View>
          {setBeneficiariesEnabled.isError && (
            <Text style={s.errorText}>
              {setBeneficiariesEnabled.error instanceof Error
                ? setBeneficiariesEnabled.error.message
                : 'Unable to update beneficiaries.'}
            </Text>
          )}
        </MCard>

        {!beneficiariesActive ? (
          <MCard padding={24}>
            <Text style={s.lockedTitle}>Beneficiaries are locked</Text>
            <Text style={s.lockedBody}>
              Enable the toggle above to activate this section, or choose Self +
              beneficiaries during your credit application.
            </Text>
            <MBtn
              variant="primary"
              sm
              disabled={setBeneficiariesEnabled.isPending}
              onPress={() => setBeneficiariesEnabled.mutate(true)}
            >
              {setBeneficiariesEnabled.isPending ? 'Enabling...' : 'Activate Beneficiaries'}
            </MBtn>
          </MCard>
        ) : (
          <>
        {/* ============================================================ */}
        {/*  2. Beneficiary Cards                                        */}
        {/* ============================================================ */}
        {beneficiaries.map(ben => (
          <React.Fragment key={ben.id}>
            <MCard padding={16}>
              <View style={s.benRow}>
                <MAvatar name={ben.name} size={48} bg={colors.navy} />
                <View style={s.benInfo}>
                  <Text style={s.benName}>{ben.name}</Text>
                  <View style={s.benMeta}>
                    <GGPill type="info">{ben.relation ?? 'Family'}</GGPill>
                    {ben.age != null && ben.age > 0 && (
                      <Text style={s.benAge}>Age {ben.age}</Text>
                    )}
                    <Text style={s.benAge}>
                      {ben.countryCode
                        ? getCountryByCode(ben.countryCode)?.name ?? ben.countryCode
                        : 'Not provided'}
                    </Text>
                  </View>
                </View>
                <GGPill type="success">Active</GGPill>
              </View>

              {/* Action buttons */}
              <View style={s.benActions}>
                <Pressable
                  style={s.benActionBtn}
                  onPress={() => openEditForm(ben)}
                >
                  <EditIcon size={14} color={colors.blue} />
                  <Text style={s.benActionEdit}>Edit</Text>
                </Pressable>
                <Pressable
                  style={s.benActionBtn}
                  onPress={() => {
                    setShowAddForm(false)
                    setEditingBen(null)
                    setDeletingBen(ben)
                  }}
                >
                  <TrashIcon size={14} color={colors.error} />
                  <Text style={s.benActionDelete}>Remove</Text>
                </Pressable>
              </View>
            </MCard>

            {/* Delete confirmation */}
            {deletingBen?.id === ben.id && (
              <MCard padding={16} style={s.deleteCard}>
                <Text style={s.deleteTitle}>Remove {ben.name}?</Text>
                <Text style={s.deleteDesc}>
                  This beneficiary will be removed from your account and will no
                  longer be covered under your healthcare credit.
                </Text>
                <View style={s.formBtnRow}>
                  <MBtn
                    variant="secondary"
                    style={{ flex: 1 }}
                    onPress={() => setDeletingBen(null)}
                  >
                    Cancel
                  </MBtn>
                  <MBtn
                    variant="danger"
                    style={{ flex: 1 }}
                    disabled={deleteLoading}
                    onPress={() => handleDelete(ben)}
                  >
                    {deleteLoading ? 'Removing...' : 'Remove'}
                  </MBtn>
                </View>
              </MCard>
            )}

            {/* Inline edit form for this beneficiary */}
            {editingBen?.id === ben.id && renderForm()}
          </React.Fragment>
        ))}

        {/* ============================================================ */}
        {/*  3. Add Form (when open)                                     */}
        {/* ============================================================ */}
        {showAddForm && renderForm()}

        {/* ============================================================ */}
        {/*  4. Add Beneficiary CTA                                      */}
        {/* ============================================================ */}
        {!isFormOpen && (
          <View style={s.addCard}>
            <View style={s.addIconCircle}>
              <PersonPlusIcon size={22} color={colors.blue} />
            </View>
            <Text style={s.addTitle}>Add a Beneficiary</Text>
            <Text style={s.addSubtitle}>
              Cover family members with your credit
            </Text>
            <MBtn variant="outline" sm onPress={openAddForm}>
              + Add Beneficiary
            </MBtn>
          </View>
        )}

        </>
        )}

        {/* bottom spacer */}
        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

export default BeneficiariesScreen

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */
const s = StyleSheet.create({
  /* loading */
  loadWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadText: {
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
  },

  /* info notice */
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.blue3,
    borderRadius: radii.default,
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.blueInk,
    lineHeight: 18,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleTitle: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  toggleSub: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 17,
  },
  lockedTitle: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  lockedBody: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
  },

  /* beneficiary card */
  benRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benInfo: {
    flex: 1,
    gap: 4,
  },
  benName: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  benMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benAge: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
  },

  /* beneficiary action buttons */
  benActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  benActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  benActionEdit: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: colors.blue,
  },
  benActionDelete: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: colors.error,
  },

  /* delete confirmation card */
  deleteCard: {
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  deleteTitle: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.error,
    marginBottom: 6,
  },
  deleteDesc: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 19,
    marginBottom: 14,
  },

  /* form card */
  formTitle: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 17,
    marginBottom: 16,
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },

  /* fields */
  labelRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  fieldLabel: {
    fontFamily: fontWeights.bold,
    fontSize: 12,
    color: colors.text,
  },
  asterisk: {
    fontFamily: fontWeights.bold,
    fontSize: 12,
    color: colors.error,
  },

  /* dropdown */
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
  },
  dropdownText: {
    fontSize: 14,
    fontFamily: fontWeights.regular,
    color: colors.text,
    flex: 1,
  },
  dropdownList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    overflow: 'hidden',
    ...shadows.card,
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownOptionText: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.text,
  },

  /* error */
  errorText: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: colors.error,
    marginTop: 4,
    marginBottom: 4,
  },

  /* add CTA card */
  addCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.large,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
  },
  addIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.blue3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTitle: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  addSubtitle: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    textAlign: 'center',
    marginBottom: 4,
  },
})
