import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, GGPill, Stars, FilterChips } from '@/components'
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

function LocationDotIcon({ size = 16, color = colors.success }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={10} r={4} fill={color} />
    </Svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Filter config                                                      */
/* ------------------------------------------------------------------ */
const FILTER_ITEMS = [
  { label: 'All Providers' },
  { label: 'Open Now' },
  { label: 'Top Rated' },
  { label: 'Nearest First' },
]

/* ------------------------------------------------------------------ */
/*  Location banners                                                   */
/* ------------------------------------------------------------------ */
function LocationActiveBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <View style={styles.bannerWrap}>
      <View style={[styles.banner, styles.bannerActive]}>
        <LocationDotIcon size={14} color={colors.success} />
        <Text style={styles.bannerActiveText}>
          Location active · Showing driving distances
        </Text>
        <Pressable hitSlop={8} onPress={onDismiss}>
          <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
            <Path d="M2 2l8 8M10 2L2 10" stroke={colors.success} strokeWidth={1.4} strokeLinecap="round" />
          </Svg>
        </Pressable>
      </View>
    </View>
  )
}

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
  const [bannerDismissed, setBannerDismissed] = useState(false)

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

  const getInitials = (name: string) =>
    name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Screen>
      <AppBar
        title={`${categoryLabel} Near You`}
        subtitle={`${providers.length} verified provider${providers.length !== 1 ? 's' : ''} found`}
      />

      {/* Location banner */}
      {!bannerDismissed && locState === 'active' && (
        <LocationActiveBanner onDismiss={() => setBannerDismissed(true)} />
      )}
      {(locState === 'denied' || locState === 'skipped') && (
        <LocationDeniedBanner onRetry={requestLocationRetry} />
      )}

      {/* Filter chips */}
      <View style={styles.filterWrap}>
        <FilterChips
          items={FILTER_ITEMS}
          activeIndex={activeFilter}
          onSelect={setActiveFilter}
        />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={styles.loadingText}>Finding providers...</Text>
        </View>
      ) : filteredProviders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No providers found</Text>
          <Text style={styles.emptyDesc}>
            {activeFilter > 0
              ? 'Try adjusting your filters to see more results.'
              : `No ${categoryLabel.toLowerCase()} providers are available in your area yet.`}
          </Text>
        </View>
      ) : (
        <ScrollArea gap={12}>
          {filteredProviders.map((provider) => (
            <Pressable
              key={provider.id}
              onPress={() =>
                navigation.navigate('ProviderProfile', { providerId: provider.id })
              }
            >
              <MCard padding={14}>
                <View style={styles.cardRow}>
                  <View style={styles.logoWrap}>
                    <Text style={styles.logoText}>{getInitials(provider.name)}</Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.providerName} numberOfLines={1}>
                        {provider.name}
                      </Text>
                      <GGPill type={provider.status === 'open' ? 'open' : 'closed'}>
                        {provider.status === 'open' ? 'Open' : 'Closed'}
                      </GGPill>
                    </View>

                    <Text style={styles.address} numberOfLines={1}>
                      {provider.address}
                    </Text>

                    <View style={styles.metaRow}>
                      <Stars rating={provider.rating} count={provider.reviews} />
                      {provider.distance ? (
                        <Text style={styles.distanceText}>{provider.distance}</Text>
                      ) : null}
                    </View>

                    <Text style={styles.hours} numberOfLines={1}>
                      {provider.hours}
                    </Text>

                    {provider.services && provider.services.length > 0 && (
                      <View style={styles.tagsRow}>
                        {provider.services.slice(0, 3).map((svc, i) => (
                          <View key={i} style={styles.tag}>
                            <Text style={styles.tagText}>{svc}</Text>
                          </View>
                        ))}
                        {provider.services.length > 3 && (
                          <View style={styles.tag}>
                            <Text style={styles.tagText}>+{provider.services.length - 3}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </MCard>
            </Pressable>
          ))}
        </ScrollArea>
      )}
    </Screen>
  )
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
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
  },
  emptyDesc: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
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
  bannerActive: {
    backgroundColor: colors.successBg,
  },
  bannerText: {
    flex: 1,
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.warning,
    lineHeight: 17,
  },
  bannerActiveText: {
    flex: 1,
    fontFamily: fontWeights.medium,
    fontSize: 12,
    color: colors.success,
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

  cardRow: {
    flexDirection: 'row',
    gap: 14,
  },
  logoWrap: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.blue3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: fontWeights.bold,
    fontSize: 16,
    color: colors.blue,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  providerName: {
    fontFamily: fontWeights.bold,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  address: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.textSub,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  distanceText: {
    fontFamily: fontWeights.semiBold,
    fontSize: 12,
    color: colors.blue,
  },
  hours: {
    fontFamily: fontWeights.regular,
    fontSize: 11,
    color: colors.textLight,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    backgroundColor: colors.bg,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: fontWeights.medium,
    fontSize: 10,
    color: colors.textSub,
  },
})
