import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'
import { useNavigation, useRoute } from '@react-navigation/native'
import { colors, fontWeights, radii, shadows } from '@/theme'
import {
  Screen,
  ScrollArea,
  AppBar,
  MCard,
  MBtn,
  MAvatar,
  StatusPill,
  StatTile,
  SegmentedTabs,
  Field,
} from '@/components'
import CheckIcon from '@/icons/CheckIcon'
import { usePatientProfile, usePatientTransactions, useUpdatePatientProfileMutation } from '@gg/shared-hooks'
import { useUserStore, useAuthStore } from '@gg/shared-stores'
import { authService } from '@gg/shared-api'
import { formatCurrency, formatDate, formatPhone } from '@gg/shared-utils'
import {
  getCountryByCode,
  getWorldCountryByCode,
  isOperatingCountryCode,
  resolveResidenceSelectCode,
  WORLD_COUNTRIES,
} from '@gg/shared-config'
import type { Patient, Beneficiary } from '@gg/shared-types'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const FLAG_EMOJI: Record<string, string> = {
  KE: '\u{1F1F0}\u{1F1EA}',
  ZW: '\u{1F1FF}\u{1F1FC}',
  ZM: '\u{1F1FF}\u{1F1F2}',
}

const TABS = [
  { label: 'Personal Info' },
  { label: 'Beneficiaries' },
  { label: 'Security & PIN' },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function getInitials(name?: string): string {
  if (!name) return 'U'
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function displayValue(value?: string | null): string {
  return value?.trim() || 'Not provided'
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function ProfileScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const storedUser = useUserStore(s => s.user)
  const storedBeneficiaries = useUserStore(s => s.beneficiaries)
  const { data: profile, isLoading } = usePatientProfile()
  const { data: transactions = [] } = usePatientTransactions()
  const updateProfileMutation = useUpdatePatientProfileMutation()

  const [activeTab, setActiveTab] = useState(0)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    residenceCountryCode: 'KE',
  })
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  /* Deep-link support: when the dashboard sends us here with openSection, mount
     the profile root first, then push the requested screen so back always
     returns to the profile page (never exits the tab). */
  useEffect(() => {
    const section = route.params?.openSection
    if (!section) return
    navigation.setParams({ openSection: undefined })
    if (section === 'security') {
      navigation.navigate('SecurityPIN')
    } else if (section === 'notifications') {
      navigation.navigate('Notifications')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* derived data — resilient to undefined */
  const u = profile?.user ?? storedUser
  const beneficiaries: Beneficiary[] =
    profile?.beneficiaries ?? storedBeneficiaries ?? []
  const country = getCountryByCode(u?.countryCode ?? 'KE')
  const currency = country?.currencySymbol ?? 'Ksh.'
  const currencyCode = country?.currencyCode ?? 'KES'
  const countryName = country?.name ?? u?.country ?? 'Kenya'
  const residenceCountryName =
    u?.residenceCountry ??
    getWorldCountryByCode(resolveResidenceSelectCode(u ?? {}))?.name ??
    countryName
  const marketCountryName = countryName
  const livesAbroad = u?.residesAbroad ?? false
  const currencyLabel = country
    ? `${country.currencyName} (${country.currencyCode})`
    : 'Not available'
  const flag = FLAG_EMOJI[u?.countryCode ?? 'KE'] ?? ''

  const dateOfBirth = u?.dateOfBirth
    ? new Date(u.dateOfBirth).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Not provided'

  const phoneDisplay = u?.phone
    ? formatPhone(u.phone, countryName).display
    : 'Not provided'

  const memberSince = u?.memberSince
    ? new Date(u.memberSince).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'New Member'

  const spendable = transactions.filter(
    t => t.status === 'completed' || t.status === 'authorized',
  )
  const totalSpent = spendable.reduce((sum, t) => sum + t.amount, 0)
  const providersUsed = new Set(spendable.map(t => t.provider)).size

  const stats = useMemo(
    () => [
      { label: 'Member Since', val: memberSince },
      {
        label: 'Total Spent',
        val: `${currency}${totalSpent.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      },
      { label: 'Transactions', val: String(transactions.length) },
      { label: 'Providers Used', val: String(providersUsed) },
    ],
    [currency, memberSince, providersUsed, totalSpent, transactions.length],
  )

  const personalFields = [
    { label: 'Full Name', val: displayValue(u?.name) },
    { label: 'Email Address', val: displayValue(u?.email) },
    { label: 'Phone Number', val: phoneDisplay },
    { label: 'Country of Residence', val: residenceCountryName },
    { label: 'Market Country', val: marketCountryName },
    { label: 'Currency', val: currencyLabel },
    { label: 'National ID', val: displayValue(u?.nationalId) },
    { label: 'Date of Birth', val: dateOfBirth },
    { label: 'Member Since', val: memberSince },
  ]

  /* loading */
  if (isLoading && !u) {
    return (
      <Screen>
        <View style={s.loadWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={s.loadText}>Loading profile...</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <AppBar title="My Profile" subtitle="Manage your account" variant="hero" back={false} />

      <ScrollArea gap={14} px={16} py={14}>
        {/* ============================================================ */}
        {/*  1. Profile Header (navy gradient card)                      */}
        {/* ============================================================ */}
        <View style={s.heroCard}>
          {/* decorative circles */}
          <View style={s.decoCircle1} />
          <View style={s.decoCircle2} />

          <View style={s.heroContent}>
            {/* avatar with verification badge */}
            <View style={s.avatarWrap}>
              <MAvatar
                name={u?.name ?? 'User'}
                size={60}
                bg="rgba(255,255,255,0.15)"
              />
              <View style={s.verifyBadge}>
                <CheckIcon size={10} color="#FFFFFF" />
              </View>
            </View>

            {/* name + info */}
            <View style={s.heroInfo}>
              <Text style={s.heroName}>{u?.name ?? 'Patient'}</Text>
              <Text style={s.heroMeta}>
                {flag} {displayValue(u?.nationalId)} {'·'} {countryName}{' '}
                {'·'} {currencyCode}
              </Text>

              {/* status pills */}
              <View style={s.pillRow}>
                <StatusPill label="Verified Patient" tone="success" size="sm" />
                <StatusPill label="Balance Active" tone="info" size="sm" />
                <StatusPill
                  label={`${beneficiaries.length} Beneficiary${beneficiaries.length === 1 ? '' : 's'}`}
                  tone="teal"
                  size="sm"
                />
              </View>
            </View>
          </View>

          {/* edit profile ghost button */}
          <MBtn
            variant="ghost"
            sm
            onPress={() => {
              setEditForm({
                name: u?.name ?? '',
                email: u?.email ?? '',
                phone: u?.phone ?? '',
                residenceCountryCode: resolveResidenceSelectCode(u ?? {}),
              })
              setEditError(null)
              setShowCountryPicker(false)
              setEditing(true)
              setActiveTab(0)
            }}
          >
            Edit Profile
          </MBtn>
        </View>

        {/* ============================================================ */}
        {/*  2. Stats Grid (4 columns: 2 x 2)                           */}
        {/* ============================================================ */}
        <View style={s.statsGrid}>
          {stats.map(stat => (
            <Pressable
              key={stat.label}
              disabled={stat.label !== 'Transactions'}
              onPress={() => navigation.getParent()?.navigate('WalletTab', { screen: 'TransactionHistory' })}
              style={s.statGridItem}
            >
              <StatTile
                label={stat.label}
                value={stat.val}
                subtitle={stat.label === 'Transactions' ? 'View history →' : undefined}
              />
            </Pressable>
          ))}
        </View>

        {/* Health Ledger entry — matches web patient nav */}
        <MCard padding={16}>
          <View style={s.sectionHead}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.sectionTitle}>Health Ledger</Text>
              <Text style={s.placeholderBody}>
                View your treatment history and manage which providers can unlock it with your
                Ledger PIN.
              </Text>
            </View>
          </View>
          <MBtn variant="primary" sm onPress={() => navigation.navigate('HealthLedger')}>
            Open Health Ledger
          </MBtn>
        </MCard>

        {/* ============================================================ */}
        {/*  4. Tab Bar                                                  */}
        {/* ============================================================ */}
        <SegmentedTabs
          tabs={TABS}
          activeIndex={activeTab}
          onSelect={setActiveTab}
        />

        {/* ============================================================ */}
        {/*  5. Tab Content                                              */}
        {/* ============================================================ */}
        {activeTab === 0 && !editing && (
          <MCard padding={20}>
            {/* header */}
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Personal Details</Text>
              <MBtn
                variant="secondary"
                sm
                onPress={() => {
                  setEditForm({
                    name: u?.name ?? '',
                    email: u?.email ?? '',
                    phone: u?.phone ?? '',
                    residenceCountryCode: resolveResidenceSelectCode(u ?? {}),
                  })
                  setEditError(null)
                  setShowCountryPicker(false)
                  setEditing(true)
                }}
              >
                Edit
              </MBtn>
            </View>

            {/* label-value rows */}
            {personalFields.map((f, i) => (
              <View
                key={f.label}
                style={[
                  s.fieldRow,
                  i < personalFields.length - 1 && s.fieldRowBorder,
                ]}
              >
                <Text style={s.fieldLabel}>{f.label}</Text>
                <Text style={s.fieldValue}>{f.val}</Text>
              </View>
            ))}
          </MCard>
        )}

        {activeTab === 0 && editing && (
          <MCard padding={20}>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Edit Personal Details</Text>
            </View>

            <Field
              label="Full Name"
              placeholder="Enter your full name"
              value={editForm.name}
              onChangeText={(v: string) => setEditForm(prev => ({ ...prev, name: v }))}
              required
            />
            <Field
              label="Email Address"
              placeholder="Enter your email"
              keyboardType="email-address"
              value={editForm.email}
              onChangeText={(v: string) => setEditForm(prev => ({ ...prev, email: v }))}
              required
            />
            <Field
              label="Phone Number"
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              value={editForm.phone}
              onChangeText={(v: string) => setEditForm(prev => ({ ...prev, phone: v }))}
              required
            />

            <View style={{ marginBottom: 12 }}>
              <View style={s.labelRow}>
                <Text style={s.fieldLabel}>Country of Residence</Text>
                <Text style={s.asterisk}> *</Text>
              </View>
              <Pressable
                style={s.dropdownBtn}
                onPress={() => setShowCountryPicker(!showCountryPicker)}
              >
                <Text style={s.dropdownText} numberOfLines={1}>
                  {getWorldCountryByCode(editForm.residenceCountryCode)?.name ??
                    'Select country'}
                </Text>
              </Pressable>
              {showCountryPicker && (
                <View style={s.dropdownList}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {WORLD_COUNTRIES.map(opt => (
                    <Pressable
                      key={opt.code}
                      style={[
                        s.dropdownOption,
                        editForm.residenceCountryCode === opt.code && {
                          backgroundColor: colors.blue3,
                        },
                      ]}
                      onPress={() => {
                        setEditForm(prev => ({ ...prev, residenceCountryCode: opt.code }))
                        setShowCountryPicker(false)
                      }}
                    >
                      <Text
                        style={[
                          s.dropdownOptionText,
                          editForm.residenceCountryCode === opt.code && {
                            color: colors.blue,
                            fontFamily: fontWeights.bold,
                          },
                        ]}
                      >
                        {opt.name}
                      </Text>
                    </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
              {!isOperatingCountryCode(editForm.residenceCountryCode) && (
                <Text style={s.residenceHint}>
                  You are living abroad. Your wallet currency stays tied to your registered
                  market ({marketCountryName}).
                </Text>
              )}
            </View>

            <View style={[s.fieldRow, s.fieldRowBorder]}>
              <Text style={s.fieldLabel}>Market Country</Text>
              <Text style={s.fieldValue}>{marketCountryName}</Text>
            </View>
            <View style={[s.fieldRow, s.fieldRowBorder]}>
              <Text style={s.fieldLabel}>Currency</Text>
              <Text style={s.fieldValue}>{currencyLabel}</Text>
            </View>
            <View style={[s.fieldRow, s.fieldRowBorder]}>
              <Text style={s.fieldLabel}>National ID</Text>
              <Text style={s.fieldValue}>{displayValue(u?.nationalId)}</Text>
            </View>
            <View style={[s.fieldRow, s.fieldRowBorder]}>
              <Text style={s.fieldLabel}>Date of Birth</Text>
              <Text style={s.fieldValue}>{dateOfBirth}</Text>
            </View>
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>Member Since</Text>
              <Text style={s.fieldValue}>{memberSince}</Text>
            </View>

            {editError && <Text style={s.editError}>{editError}</Text>}

            <View style={s.editBtnRow}>
              <MBtn
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => {
                  setEditing(false)
                  setEditError(null)
                }}
              >
                Cancel
              </MBtn>
              <MBtn
                variant="primary"
                style={{ flex: 2 }}
                disabled={editLoading}
                onPress={async () => {
                  if (!editForm.name.trim()) {
                    setEditError('Name is required')
                    return
                  }
                  if (!editForm.email.trim()) {
                    setEditError('Email is required')
                    return
                  }
                  if (!editForm.residenceCountryCode) {
                    setEditError('Country of residence is required')
                    return
                  }
                  const selected = getWorldCountryByCode(editForm.residenceCountryCode)
                  setEditError(null)
                  setEditLoading(true)
                  try {
                    await updateProfileMutation.mutateAsync({
                      name: editForm.name.trim(),
                      email: editForm.email.trim(),
                      phone: editForm.phone.trim(),
                      residenceCountryCode: editForm.residenceCountryCode,
                      residenceCountryName: selected?.name ?? editForm.residenceCountryCode,
                    })
                    setEditing(false)
                  } catch (err: any) {
                    setEditError(err?.message ?? 'Failed to update profile')
                  } finally {
                    setEditLoading(false)
                  }
                }}
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </MBtn>
            </View>
          </MCard>
        )}

        {activeTab === 1 && (
          <MCard padding={24}>
            <Text style={s.placeholderTitle}>Beneficiaries</Text>
            <Text style={s.placeholderBody}>
              View and manage your covered family members on the dedicated
              Beneficiaries screen.
            </Text>
            <MBtn
              variant="primary"
              sm
              onPress={() => navigation.navigate('Beneficiaries')}
            >
              Go to Beneficiaries
            </MBtn>
          </MCard>
        )}

        {activeTab === 2 && (
          <MCard padding={24}>
            <Text style={s.placeholderTitle}>Security & PIN</Text>
            <Text style={s.placeholderBody}>
              Manage your payment PIN authorization and password settings on the
              Security screen. Your Health Ledger PIN is separate and controls
              provider access to your treatment history.
            </Text>
            <View style={{ gap: 10 }}>
              <MBtn
                variant="primary"
                sm
                onPress={() => navigation.navigate('SecurityPIN')}
              >
                Go to Security
              </MBtn>
              <MBtn
                variant="outline"
                sm
                onPress={() => navigation.navigate('HealthLedger')}
              >
                Health Ledger PIN
              </MBtn>
            </View>
          </MCard>
        )}

        {/* Sign Out */}
        <Pressable
          style={s.signOutBtn}
          onPress={async () => {
            await authService.logout()
            useAuthStore.getState().logout()
          }}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke={colors.error} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M16 17l5-5-5-5M21 12H9" stroke={colors.error} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={s.signOutText}>Sign Out</Text>
        </Pressable>

        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

export default ProfileScreen

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

  /* appbar-style header */
  appBarRow: {
    paddingVertical: 4,
  },
  appBarTitle: {
    fontSize: 18,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  appBarSub: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    marginTop: 2,
  },

  /* hero card */
  heroCard: {
    backgroundColor: colors.navy,
    borderRadius: radii.card,
    padding: 24,
    overflow: 'hidden',
    gap: 16,
    ...shadows.raised,
  },
  decoCircle1: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  decoCircle2: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    zIndex: 1,
  },
  avatarWrap: {
    position: 'relative',
  },
  verifyBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.navy,
  },
  heroInfo: {
    flex: 1,
    gap: 6,
  },
  heroName: {
    fontSize: 18,
    fontFamily: fontWeights.extraBold,
    color: '#FFFFFF',
  },
  heroMeta: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: 'rgba(255,255,255,0.5)',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },

  /* stats grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statGridItem: {
    width: '48%' as any,
    flexGrow: 1,
  },
  statCardInner: {
    alignItems: 'center',
  },
  statLabelLink: {
    color: colors.blue,
    fontFamily: fontWeights.bold,
  },

  /* section header */
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },

  /* personal info rows */
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
  },
  fieldRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: colors.textSub,
    flex: 1,
  },
  fieldValue: {
    fontSize: 14,
    fontFamily: fontWeights.semiBold,
    color: colors.text,
    flex: 1.5,
    textAlign: 'right',
  },

  /* edit mode */
  editBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  editError: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: colors.error,
    marginTop: 8,
  },

  /* tab placeholders */
  placeholderTitle: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 8,
  },
  placeholderBody: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 20,
    marginBottom: 16,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: radii.large,
    borderWidth: 1.5,
    borderColor: 'rgba(229,71,77,0.35)',
    backgroundColor: colors.card,
    marginTop: 8,
  },
  signOutText: {
    fontSize: 14,
    fontFamily: fontWeights.semiBold,
    color: colors.error,
  },
  labelRow: { flexDirection: 'row', marginBottom: 6 },
  asterisk: { fontFamily: fontWeights.bold, fontSize: 12, color: colors.error },
  dropdownBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
  },
  dropdownText: { fontSize: 14, fontFamily: fontWeights.regular, color: colors.text },
  dropdownList: {
    marginTop: 4,
    maxHeight: 220,
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
  dropdownOptionText: { fontSize: 13, fontFamily: fontWeights.regular, color: colors.text },
  residenceHint: {
    fontSize: 11,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 16,
    marginTop: 8,
  },
})
