import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Pressable from '@/components/Pressable'
import { colors, fontWeights, radii } from '@/theme'
import SearchIcon from '@/icons/SearchIcon'
import { CARE_CATEGORY_STYLE, CareCategoryIcon } from '@/icons/CareCategoryIcons'
import { SERVICE_CATEGORIES } from '@gg/shared-config'
import SectionHeader from './SectionHeader'

// The six live categories, two rows of three. "Coming soon" ones stay off home.
const CATEGORIES = SERVICE_CATEGORIES.filter(cat => !cat.isComingSoon && CARE_CATEGORY_STYLE[cat.id])

/**
 * Entry point into care: a search field that opens the Services tab, and a
 * 3 × 2 grid of category tiles in the shared blue accent.
 */
export default function FindCare({
  onSearch,
  onCategory,
  onSeeAll,
}: {
  onSearch: () => void
  onCategory: (categoryId: string) => void
  onSeeAll: () => void
}) {
  return (
    <View>
      <SectionHeader title="Find care" action="See all" onAction={onSeeAll} />

      <Pressable
        onPress={onSearch}
        style={styles.search}
        accessibilityRole="search"
        accessibilityLabel="Search clinics, labs and pharmacies"
      >
        <SearchIcon size={20} color={colors.navy} />
        <Text style={styles.searchText} numberOfLines={1}>
          Search clinics, labs, pharmacies
        </Text>
      </Pressable>

      <View style={styles.grid}>
        {CATEGORIES.map(cat => {
          const { tint, short } = CARE_CATEGORY_STYLE[cat.id]
          return (
            <Pressable
              key={cat.id}
              onPress={() => onCategory(cat.id)}
              style={styles.tile}
              accessibilityRole="button"
              accessibilityLabel={`${cat.label}: ${cat.desc}`}
            >
              <View style={[styles.iconTile, { backgroundColor: tint }]}>
                <CareCategoryIcon id={cat.id} size={32} />
              </View>
              <Text style={styles.label} numberOfLines={1}>
                {cat.label}
              </Text>
              <Text style={styles.short} numberOfLines={1}>
                {short}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    backgroundColor: colors.card,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
  },
  searchText: {
    flex: 1,
    fontFamily: fontWeights.medium,
    fontSize: 15,
    color: colors.textLight,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginTop: 12,
  },
  tile: {
    width: '31.8%',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.large,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 6,
  },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  label: {
    fontFamily: fontWeights.bold,
    fontSize: 14,
    color: colors.text,
  },
  short: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
})
