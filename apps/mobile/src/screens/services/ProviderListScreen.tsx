import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, Image } from 'react-native'
import Pressable from '@/components/Pressable'
import Svg, { Path } from 'react-native-svg'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, AppBar, FilterChips } from '@/components'
import { SkeletonGroup, SkeletonList } from '@/components/Skeleton'
import ChevronRightIcon from '@/icons/ChevronRightIcon'
import { CareCategoryIcon } from '@/icons/CareCategoryIcons'
import { getProviderHoursSummary } from '@gg/shared-utils'
import { useProvidersByCategory, useDrivingDistances } from '@gg/shared-hooks'
import { useLocationStore } from '@gg/shared-stores'
import { SERVICE_CATEGORIES } from '@gg/shared-config'
import { requestLocationRetry } from '@/lib/location'
import type { Provider } from '@gg/shared-types'
import type { ServicesScreenProps } from '@/navigation/types'

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */
function TriangleAlertIcon({ size = 16, color = colors.warning }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L1 21h22L12 2z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M12 9v5M12 17v.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

function StarIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path
        d="M12 2.8l2.8 5.7 6.3.9-4.5 4.4 1.1 6.3L12 17.1l-5.6 3 1.1-6.3L3 9.4l6.3-.9z"
        fill={colors.blueInk}
      />
    </Svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Filter config                                                      */
/* ------------------------------------------------------------------ */
const FILTER_LABELS = ['All', 'Open now', 'Top rated', 'Nearest']

/* ------------------------------------------------------------------ */
/*  Location banners                                                   */
/* ------------------------------------------------------------------ */
function LocationDeniedBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.bannerWrap}>
      <View style={styles.banner}>
        <TriangleAlertIcon size={16} color={colors.warning} />
        <Text style={styles.bannerText}>
          Location unavailable — distances are approximate
        </Text>
        <Pressable hitSlop={8} onPress={onRetry}>
          <Text style={styles.bannerLink}>Try again</Text>
        </Pressable>
      </View>
    </View>
  )
}

/* ------------------------------------------------------------------ */
/*  ProviderListScreen                                                 */
/* ------------------------------------------------------------------ */
export function ProviderListScreen({
  navigation,
  route,
}: ServicesScreenProps<'ProviderList'>) {
  const { category } = route.params
  const { data: providers = [], isLoading } = useProvidersByCategory(category)
  const [activeFilter, setActiveFilter] = useState(0)

  const position = useLocationStore(s => s.position)
  const locState = useLocationStore(s => s.locState)

  const { getLabel, getKm } = useDrivingDistances(position, providers)

  const categoryMeta = SERVICE_CATEGORIES.find((c) => c.id === category)
  const categoryLabel = categoryMeta?.label ?? category

  const enrichedProviders = useMemo(() =>
    providers.map(provider => ({
      ...provider,
      distance: getLabel(provider),
      _distKm: getKm(provider),
    })),
    [providers, getLabel, getKm],
  )

  const filteredProviders = useMemo(() => {
    let list = [...enrichedProviders]

    switch (activeFilter) {
      case 1:
        list = list.filter((p) => p.status === 'open')
        break
      case 2:
        list = list.sort((a, b) => b.rating - a.rating)
        break
      case 3:
        list = list.sort((a, b) => {
          const distA = a._distKm ?? (parseFloat(a.distance) || 999)
          const distB = b._distKm ?? (parseFloat(b.distance) || 999)
          return distA - distB
        })
        break
      default:
        break
    }

    return list
  }, [enrichedProviders, activeFilter])

  const openCount = enrichedProviders.filter(p => p.status === 'open').length
  const filterItems = FILTER_LABELS.map((label, i) => ({
    label,
    count: i === 0 ? enrichedProviders.length : i === 1 ? openCount : undefined,
  }))
  // "Laboratory" -> "Laboratories", "Doctor" -> "Doctors"
  const categoryTitle = categoryLabel.endsWith('y') && !categoryLabel.endsWith('ay')
    ? `${categoryLabel.slice(0, -1)}ies`
    : categoryLabel.endsWith('s') ? categoryLabel : `${categoryLabel}s`

  return (
    <Screen>
      <AppBar
        title={categoryTitle}
        subtitle={isLoading ? 'Finding providers…' : `${providers.length} verified ${providers.length === 1 ? 'provider' : 'providers'}`}
      />

      {/* Location banner */}
      {(locState === 'denied' || locState === 'skipped') && (
        <LocationDeniedBanner onRetry={requestLocationRetry} />
      )}

      {/* Filter chips */}
      <View style={styles.filterWrap}>
        <FilterChips
          items={filterItems}
          activeIndex={activeFilter}
          onSelect={setActiveFilter}
        />
      </View>

      {isLoading ? (
        <SkeletonGroup style={styles.skeleton}>
          <SkeletonList rows={4} />
        </SkeletonGroup>
      ) : filteredProviders.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <CareCategoryIcon id={category} size={30} />
          </View>
          <Text style={styles.emptyTitle}>
            {activeFilter === 1 ? 'Nothing open right now' : 'No providers yet'}
          </Text>
          <Text style={styles.emptyDesc}>
            {activeFilter === 1
              ? 'Try "All" to see every provider and their opening hours.'
              : `No ${categoryLabel.toLowerCase()} providers have joined in your area yet.`}
          </Text>
        </View>
      ) : (
        <ScrollArea gap={12} py={4}>
          {filteredProviders.map(provider => {
            const open = provider.status === 'open'
            const services = provider.services ?? []
            return (
              <Pressable
                key={provider.id}
                onPress={() => navigation.navigate('ProviderProfile', { providerId: provider.id })}
                style={styles.card}
                accessibilityRole="button"
                accessibilityLabel={`${provider.name}, ${provider.address}. Rated ${provider.rating.toFixed(1)}. ${getProviderHoursSummary(provider)}${provider.distance ? `, ${provider.distance}` : ''}`}
              >
                <View style={styles.cardRow}>
                  <View style={styles.logoWrap}>
                    {provider.logoUrl ? (
                      <Image source={{ uri: provider.logoUrl }} style={styles.logoImage} />
                    ) : (
                      <CareCategoryIcon id={category} size={28} />
                    )}
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.providerName} numberOfLines={2}>
                      {provider.name}
                    </Text>
                    <Text style={styles.address} numberOfLines={1}>
                      {provider.address}
                    </Text>
                    <View style={styles.ratingRow}>
                      <StarIcon />
                      <Text style={styles.ratingText}>{provider.rating.toFixed(1)}</Text>
                      <Text style={styles.ratingCount}>
                        ({provider.reviews} {provider.reviews === 1 ? 'review' : 'reviews'})
                      </Text>
                    </View>
                  </View>

                  <ChevronRightIcon size={18} color={colors.textLight} />
                </View>

                <View style={styles.footer}>
                  <View style={[styles.statusDot, open ? styles.statusDotOpen : styles.statusDotClosed]} />
                  <Text style={[styles.statusText, open && styles.statusTextOpen]} numberOfLines={1}>
                    {getProviderHoursSummary(provider)}
                  </Text>
                  {provider.distance ? <Text style={styles.distanceText}>{provider.distance}</Text> : null}
                </View>

                {services.length > 0 ? (
                  <View style={styles.tagsRow}>
                    {services.slice(0, 3).map(svc => (
                      <View key={svc} style={styles.tag}>
                        <Text style={styles.tagText} numberOfLines={1}>{svc}</Text>
                      </View>
                    ))}
                    {services.length > 3 ? (
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>+{services.length - 3}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </Pressable>
            )
          })}
        </ScrollArea>
      )}
    </Screen>
  )
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  skeleton: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.blue100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: fontWeights.bold,
    fontSize: 17,
    color: colors.text,
  },
  emptyDesc: {
    fontFamily: fontWeights.regular,
    fontSize: 14,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 20,
  },

  bannerWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.warningBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bannerText: {
    flex: 1,
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.warning,
    lineHeight: 17,
  },
  bannerLink: {
    fontFamily: fontWeights.semiBold,
    fontSize: 12,
    color: colors.warning,
  },

  filterWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radii.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.blue100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  logoImage: {
    width: 56,
    height: 56,
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  providerName: {
    fontFamily: fontWeights.bold,
    fontSize: 16,
    lineHeight: 21,
    color: colors.text,
  },
  address: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    color: colors.textSub,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  ratingText: {
    fontFamily: fontWeights.bold,
    fontSize: 13,
    color: colors.text,
  },
  ratingCount: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    color: colors.textLight,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotOpen: {
    backgroundColor: colors.success,
  },
  statusDotClosed: {
    backgroundColor: colors.textLight,
  },
  statusText: {
    flex: 1,
    fontFamily: fontWeights.semiBold,
    fontSize: 13,
    color: colors.textSub,
  },
  statusTextOpen: {
    color: colors.success,
  },
  distanceText: {
    fontFamily: fontWeights.semiBold,
    fontSize: 13,
    color: colors.blueInk,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    fontFamily: fontWeights.medium,
    fontSize: 12,
    color: colors.textSub,
  },
})
