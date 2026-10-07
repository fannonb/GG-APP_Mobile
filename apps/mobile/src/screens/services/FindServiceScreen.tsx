import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TextInput } from 'react-native'
import Pressable from '@/components/Pressable'
import { useNavigation } from '@react-navigation/native'
import Svg, { Path, Circle, Line } from 'react-native-svg'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, MCard, AppBar, StatusPill, LoadError } from '@/components'
import SearchIcon from '@/icons/SearchIcon'
import ChevronRightIcon from '@/icons/ChevronRightIcon'
import { useProviders, useDrivingDistances } from '@gg/shared-hooks'
import { useLocationStore } from '@gg/shared-stores'
import { getProviderHoursSummary } from '@gg/shared-utils'
import { CARE_CATEGORY_STYLE, CareCategoryIcon } from '@/icons/CareCategoryIcons'
import { SERVICE_CATEGORIES } from '@gg/shared-config'
import type { Provider } from '@gg/shared-types'
import type { ServicesScreenProps } from '@/navigation/types'

/* ------------------------------------------------------------------ */
/*  Category icon map                                                  */
/* ------------------------------------------------------------------ */
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
  const { data: providers = [], isLoading, isError, isFetching, refetch } = useProviders()
  const position = useLocationStore(s => s.position)
  const { getLabel } = useDrivingDistances(position, providers)

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

  const searchResults = useMemo(() => {
    const q = searchQuery.trim()
    if (!q) return []
    return providers.filter(provider => matchesProvider(provider, q)).slice(0, 8)
  }, [providers, searchQuery])

  const showSearchResults = searchQuery.trim().length > 0

  /* ----- Loading state ----- */
  if (isLoading && providers.length === 0) {
    return (
      <Screen>
        <AppBar title="Find a Service" subtitle="Verified clinics, labs and pharmacies" variant="hero" back={false} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      </Screen>
    )
  }

  return (
    <Screen headerPattern="dark-curve">
      <AppBar title="Find a Service" subtitle="Verified clinics, labs and pharmacies" variant="hero" back={false} />

      <ScrollArea gap={16} px={16} py={14}>
        {/* ===== Section 1 — Search ===== */}
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
        </View>

        {/* No providers is not a reason to hide search and categories: the
            patient still needs to see what GG'APP offers. */}
        {isError && providers.length === 0 ? (
          <LoadError
            title="We couldn't load providers."
            body="Check your connection and try again."
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        ) : null}

        {showSearchResults && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, styles.sectionTitleOnDark]}>Search Results</Text>
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
                          {provider.category ? provider.category.charAt(0).toUpperCase() + provider.category.slice(1) : ''} · {getLabel(provider)} · {getProviderHoursSummary(provider)}
                        </Text>
                        <View style={styles.resultBadges}>
                          <Text style={styles.resultRating}>★ {provider.rating.toFixed(1)}</Text>
                          <StatusPill
                            label={provider.status === 'open' ? 'Open' : 'Closed'}
                            tone={provider.status === 'open' ? 'success' : 'navy'}
                            size="sm"
                          />
                        </View>
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
            <Text style={[styles.sectionTitle, styles.sectionTitleOnDark]}>Select a Category</Text>
          </View>

          {/* Compact rows: all categories fit on one screen (the old cards took about 1.5). */}
          <View style={styles.categoryList}>
            {SERVICE_CATEGORIES.map((cat, i) => {
              const soon = Boolean(cat.isComingSoon)
              const count = categoryCounts.get(cat.id) ?? 0
              return (
                <Pressable
                  key={cat.id}
                  disabled={soon}
                  onPress={() => navigation.navigate('ProviderList', { category: cat.id })}
                  style={[styles.categoryRow, i < SERVICE_CATEGORIES.length - 1 && styles.categoryDivider]}
                  accessibilityRole="button"
                  accessibilityLabel={soon ? `${cat.label}, coming soon` : `${cat.label}, ${count} ${count === 1 ? 'provider' : 'providers'}`}
                  accessibilityState={{ disabled: soon }}
                >
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: CARE_CATEGORY_STYLE[cat.id]?.tint ?? colors.blue100 },
                      soon && styles.categoryIconSoon,
                    ]}
                  >
                    <CareCategoryIcon id={cat.id} size={27} color={soon ? colors.textLight : undefined} />
                  </View>
                  <View style={styles.categoryText}>
                    <Text style={[styles.categoryName, soon && styles.categoryNameSoon]} numberOfLines={1}>
                      {cat.label}
                    </Text>
                    <Text style={styles.categoryDesc} numberOfLines={1}>
                      {cat.desc}
                    </Text>
                  </View>
                  {soon ? (
                    <StatusPill label="Coming soon" tone="warning" size="sm" />
                  ) : (
                    <>
                      <Text style={styles.categoryCount}>{count}</Text>
                      <ChevronRightIcon size={16} color={colors.textLight} />
                    </>
                  )}
                </Pressable>
              )
            })}
          </View>
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

  /* Section headers */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  // Headings that sit on the navy curve at the top of the scroll.
  sectionTitleOnDark: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontFamily: fontWeights.bold,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },

  /* Section 2 — Category rows */
  categoryList: {
    backgroundColor: colors.card,
    borderRadius: radii.large,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  categoryDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconSoon: {
    backgroundColor: colors.surfaceMuted,
  },
  categoryText: {
    flex: 1,
    gap: 2,
  },
  categoryName: {
    fontFamily: fontWeights.bold,
    fontSize: 15,
    color: colors.text,
  },
  categoryNameSoon: {
    color: colors.textSub,
  },
  categoryDesc: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    color: colors.textSub,
  },
  categoryCount: {
    fontFamily: fontWeights.semiBold,
    fontSize: 14,
    color: colors.textSub,
  },
  resultBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  resultRating: {
    fontFamily: fontWeights.semiBold,
    fontSize: 13,
    color: colors.text,
  },

  /* Global Specialists card */

  /* Section 3 — Nearby Providers */
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 14,
  },
})
