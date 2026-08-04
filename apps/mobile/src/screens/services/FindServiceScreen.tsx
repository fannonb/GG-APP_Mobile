import React, { useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator, TextInput } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Svg, { Path, Circle, Line } from 'react-native-svg'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, MCard, Stars, CategoryCard, AppBar, StatusPill } from '@/components'
import SearchIcon from '@/icons/SearchIcon'
import PharmacyIcon from '@/icons/PharmacyIcon'
import LaboratoryIcon from '@/icons/LaboratoryIcon'
import DoctorIcon from '@/icons/DoctorIcon'
import RadiologyIcon from '@/icons/RadiologyIcon'
import HospitalIcon from '@/icons/HospitalIcon'
import ClinicIcon from '@/icons/ClinicIcon'
import GlobeIcon from '@/icons/GlobeIcon'
import ChevronRightIcon from '@/icons/ChevronRightIcon'
import { useProviders, useDrivingDistances } from '@gg/shared-hooks'
import { useLocationStore } from '@gg/shared-stores'
import { SERVICE_CATEGORIES } from '@gg/shared-config'
import type { Provider } from '@gg/shared-types'
import type { ServicesScreenProps } from '@/navigation/types'

/* ------------------------------------------------------------------ */
/*  Category icon map                                                  */
/* ------------------------------------------------------------------ */
const CAT_ICONS: Record<string, React.ReactNode> = {
  pharmacy:            <PharmacyIcon size={22} color={colors.blue} />,
  laboratory:          <LaboratoryIcon size={22} color={colors.blue} />,
  doctor:              <DoctorIcon size={22} color={colors.blue} />,
  radiology:           <RadiologyIcon size={22} color={colors.blue} />,
  hospital:            <HospitalIcon size={22} color={colors.blue} />,
  clinic:              <ClinicIcon size={22} color={colors.blue} />,
  global_specialists:  <GlobeIcon size={22} color={colors.blue} />,
}

/* ------------------------------------------------------------------ */
/*  Clock icon (inline SVG for "Verified Network")                     */
/* ------------------------------------------------------------------ */
function ClockIcon({ size = 16, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Path d="M12 7v5l3 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Search helpers                                                     */
/* ------------------------------------------------------------------ */
function providerSearchBlob(provider: Provider): string {
  return [
    provider.name,
    provider.category,
    ...(provider.categories ?? []),
    provider.address,
    provider.country ?? '',
    provider.about ?? '',
    ...provider.services,
  ]
    .join(' ')
    .toLowerCase()
}

function matchesProvider(provider: Provider, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false
  return providerSearchBlob(provider).includes(q)
}

/* ------------------------------------------------------------------ */
/*  FindServiceScreen                                                  */
/* ------------------------------------------------------------------ */
export function FindServiceScreen({ navigation }: ServicesScreenProps<'FindService'>) {
  const [searchQuery, setSearchQuery] = useState('')
  const { data: providers = [], isLoading } = useProviders()
  const position = useLocationStore(s => s.position)
  const { getKm, getLabel } = useDrivingDistances(position, providers)

  /* Category provider counts */
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const provider of providers) {
      const cats =
        provider.categories && provider.categories.length > 0
          ? provider.categories
          : [provider.category]
      for (const cat of cats) {
        counts.set(cat, (counts.get(cat) ?? 0) + 1)
      }
    }
    return counts
  }, [providers])

  /* Nearby providers — sorted by driving distance, first 4 */
  const nearbyProviders = useMemo(() => {
    return [...providers]
      .sort((a, b) => {
        const dA = getKm(a) ?? (parseFloat(a.distance) || 999)
        const dB = getKm(b) ?? (parseFloat(b.distance) || 999)
        return dA - dB
      })
      .slice(0, 4)
  }, [providers, getKm])

  const searchResults = useMemo(() => {
    const q = searchQuery.trim()
    if (!q) return []
    return providers.filter(provider => matchesProvider(provider, q)).slice(0, 8)
  }, [providers, searchQuery])

  const showSearchResults = searchQuery.trim().length > 0

  /* ----- Loading state ---  /* loading */
  if (isLoading && providers.length === 0) {
    return (
      <Screen>
        <AppBar title="Find a Service" subtitle="Search verified healthcare providers & clinics" variant="hero" back={false} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      </Screen>
    )
  }

  /* ----- Empty state ----- */
  if (providers.length === 0 && !isLoading) {
    return (
      <Screen>
        <AppBar title="Find a Service" subtitle="Search verified healthcare providers & clinics" variant="hero" back={false} />
        <View style={styles.centered}>
          <SearchIcon size={48} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No providers found</Text>
          <Text style={styles.emptyDesc}>
            We could not find any providers at this time. Please try again later.
          </Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <AppBar title="Find a Service" subtitle="Search verified healthcare providers & clinics" variant="hero" back={false} />

      <ScrollArea gap={16} px={16} py={14}>
        {/* ===== Section 1 — Search Input & Verified Badge ===== */}
        <View style={styles.searchContainer}>
          <View style={styles.searchField}>
            <SearchIcon size={18} color={colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search providers, services, locations..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.verifiedBadge}>
            <ClockIcon size={12} color={colors.blueInk} />
            <Text style={styles.verifiedText}>Verified Network</Text>
          </View>
        </View>

        {showSearchResults && (
          <View>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle}>Search Results</Text>
            </View>
            <MCard padding={0}>
              {searchResults.length === 0 ? (
                <View style={styles.centered}>
                  <Text style={styles.emptyDesc}>No providers match your search.</Text>
                </View>
              ) : (
                searchResults.map((provider, index) => (
                  <React.Fragment key={provider.id}>
                    <Pressable
                      style={styles.providerRow}
                      onPress={() =>
                        navigation.navigate('ProviderProfile', {
                          providerId: String(provider.id),
                        })
                      }
                    >
                      <View style={styles.providerInfo}>
                        <Text style={styles.providerName}>{provider.name}</Text>
                        <Text style={styles.providerMeta}>
                          {provider.category} · {getLabel(provider)}
                        </Text>
                      </View>
                      <ChevronRightIcon size={16} color={colors.textLight} />
                    </Pressable>
                    {index < searchResults.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                ))
              )}
            </MCard>
          </View>
        )}

        {!showSearchResults && (
          <>
        <View>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>Select a Category</Text>
          </View>

          <View style={styles.grid}>
            {SERVICE_CATEGORIES.filter((cat) => !cat.isComingSoon).map((cat) => (
              <View key={cat.id} style={styles.gridItem}>
                <CategoryCard
                  icon={CAT_ICONS[cat.id] ?? <DoctorIcon size={22} color={colors.blue} />}
                  label={cat.label}
                  desc={cat.desc}
                  count={categoryCounts.get(cat.id) ?? 0}
                  onPress={() =>
                    navigation.navigate('ProviderList', { category: cat.id })
                  }
                />
              </View>
            ))}
          </View>

          {/* Global Specialists — Coming Soon */}
          {SERVICE_CATEGORIES.filter((cat) => cat.isComingSoon).map((cat) => (
            <View key={cat.id} style={styles.globalCard}>
              <View style={styles.globalLeft}>
                <View style={styles.globalIconWrap}>
                  <GlobeIcon size={22} color={colors.blue} />
                </View>
                <View style={styles.globalTextWrap}>
                  <Text style={styles.globalLabel}>{cat.label}</Text>
                  <Text style={styles.globalDesc}>{cat.desc}</Text>
                </View>
              </View>
              <StatusPill label="Coming Soon" tone="warning" size="sm" />
            </View>
          ))}
        </View>

        {/* ===== Section 3 — Nearby Verified Providers ===== */}
        <View>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>Nearby Verified Providers</Text>
          </View>

          <MCard padding={0}>
            {nearbyProviders.map((provider, index) => (
              <React.Fragment key={provider.id}>
                <Pressable
                  style={styles.providerRow}
                  onPress={() =>
                    navigation.navigate('ProviderProfile', {
                      providerId: provider.id,
                    })
                  }
                >
                  <View style={styles.providerAvatar}>
                    <Text style={styles.providerAvatarText}>
                      {provider.name
                        .split(' ')
                        .map((w) => w[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.providerInfo}>
                    <Text style={styles.providerName} numberOfLines={1}>
                      {provider.name}
                    </Text>
                    <Text style={styles.providerMeta} numberOfLines={1}>
                      {provider.category} · {getLabel(provider)}
                    </Text>
                  </View>

                  <View style={styles.providerRight}>
                    <Stars rating={provider.rating} count={provider.reviews} />
                    <StatusPill
                      label={provider.status === 'open' ? 'Open' : 'Closed'}
                      tone={provider.status === 'open' ? 'success' : 'navy'}
                      size="sm"
                    />
                  </View>
                </Pressable>

                {index < nearbyProviders.length - 1 && (
                  <View style={styles.divider} />
                )}
              </React.Fragment>
            ))}
          </MCard>
        </View>
        </>
        )}
      </ScrollArea>
    </Screen>
  )
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  /* Loading / Empty states */
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontFamily: fontWeights.medium,
    fontSize: 14,
    color: colors.textSub,
    marginTop: 8,
  },
  emptyTitle: {
    fontFamily: fontWeights.bold,
    fontSize: 16,
    color: colors.text,
    marginTop: 8,
  },
  emptyDesc: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 20,
  },

  /* Section 1 — Search */
  searchContainer: {
    gap: 10,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.default,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontWeights.regular,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.blue100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    gap: 6,
  },
  verifiedText: {
    fontFamily: fontWeights.semiBold,
    fontSize: 11,
    color: colors.blueInk,
  },

  /* Section headers */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionBar: {
    width: 3,
    height: 16,
    backgroundColor: colors.blue,
    borderRadius: 2,
  },
  sectionTitle: {
    fontFamily: fontWeights.bold,
    fontSize: 14,
    color: colors.text,
  },

  /* Section 2 — Category grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
    flexGrow: 1,
  },

  /* Global Specialists card */
  globalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 12,
  },
  globalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  globalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.blue3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globalTextWrap: {
    flex: 1,
  },
  globalLabel: {
    fontFamily: fontWeights.bold,
    fontSize: 13,
    color: colors.text,
    marginBottom: 2,
  },
  globalDesc: {
    fontFamily: fontWeights.regular,
    fontSize: 11,
    color: colors.textSub,
  },

  /* Section 3 — Nearby Providers */
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  providerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.blue3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerAvatarText: {
    fontFamily: fontWeights.bold,
    fontSize: 13,
    color: colors.blue,
  },
  providerInfo: {
    flex: 1,
    gap: 3,
  },
  providerName: {
    fontFamily: fontWeights.bold,
    fontSize: 14,
    color: colors.text,
  },
  providerMeta: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.textSub,
  },
  providerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 14,
  },
})
