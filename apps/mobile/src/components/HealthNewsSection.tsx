import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Modal,
  Linking,
  StyleSheet,
  useWindowDimensions,
} from 'react-native'
import Pressable from '@/components/Pressable'
import Svg, { Path } from 'react-native-svg'
import { usePatientNews } from '@gg/shared-hooks'
import { formatDate } from '@gg/shared-utils'
import type { NewsItem } from '@gg/shared-types'
import { colors, fontWeights, radii, shadows } from '@/theme'
import MBtn from './MBtn'

const CARD_WIDTH = 268

type CardTheme = {
  backgroundColor: string
  borderColor: string
  titleColor: string
  snippetColor: string
  sourceLabelColor: string
  sourceColor: string
  dateBg: string
  dateColor: string
  dividerColor: string
  arrowColor: string
}

const CARD_THEMES: CardTheme[] = [
  {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(9, 28, 68, 0.05)',
    titleColor: colors.navy,
    snippetColor: colors.textSub,
    sourceLabelColor: colors.textLight,
    sourceColor: colors.navy,
    dateBg: colors.blue3,
    dateColor: colors.blue,
    dividerColor: 'rgba(9, 28, 68, 0.05)',
    arrowColor: colors.blue,
  },
  {
    backgroundColor: '#F5F9FF',
    borderColor: 'rgba(56, 182, 255, 0.1)',
    titleColor: colors.navy,
    snippetColor: colors.textSub,
    sourceLabelColor: colors.textLight,
    sourceColor: colors.navy,
    dateBg: '#FFFFFF',
    dateColor: colors.blue,
    dividerColor: 'rgba(56, 182, 255, 0.1)',
    arrowColor: colors.blue,
  },
  {
    backgroundColor: '#FCFAF9',
    borderColor: 'rgba(9, 28, 68, 0.05)',
    titleColor: colors.navy,
    snippetColor: colors.textSub,
    sourceLabelColor: colors.textLight,
    sourceColor: colors.navy,
    dateBg: colors.blue3,
    dateColor: colors.blue,
    dividerColor: 'rgba(9, 28, 68, 0.05)',
    arrowColor: colors.blue,
  },
]

function ArrowIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 14 14" fill="none">
      <Path
        d="M2 12L12 2M12 2H5M12 2v7"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function getSnippet(body: string) {
  const firstParagraph = typeof body === 'string' ? (body.split('\n\n')[0] ?? '') : ''
  const snippet = firstParagraph.slice(0, 110).replace(/\s+$/, '')
  return snippet.length >= 100 ? `${snippet}…` : snippet
}

function HealthNewsModal({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderDeco} />
            <Pressable style={styles.modalCloseBtn} onPress={onClose}>
              <Text style={styles.modalCloseText}>{'✕'}</Text>
            </Pressable>
            <Text style={styles.modalHeaderTitle}>{item.title}</Text>
          </View>

          <View style={styles.modalSourceBar}>
            <View style={styles.modalSourceIcon}>
              <Text style={styles.modalSourceIconGlyph}>◷</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.modalSourceLabel}>Source</Text>
              <Text style={styles.modalSourceName}>{item.source}</Text>
              <Text style={styles.modalSourceDate}>
                {formatDate(item.date, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
            {item.url ? (
              <Pressable style={styles.modalVisitBtn} onPress={() => Linking.openURL(item.url!)}>
                <Text style={styles.modalVisitText}>Visit Source</Text>
              </Pressable>
            ) : null}
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator>
            {item.body.split('\n\n').map((para, i) => (
              <Text key={i} style={styles.modalParagraph}>
                {para}
              </Text>
            ))}
            <View style={{ height: 24 }} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <MBtn variant="dark" fullWidth onPress={onClose}>
              Close
            </MBtn>
          </View>
        </View>
      </View>
    </Modal>
  )
}

interface HealthNewsSectionProps {
  articles?: NewsItem[]
}

export default function HealthNewsSection({ articles: articlesProp }: HealthNewsSectionProps) {
  const { width } = useWindowDimensions()
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)
  const { data: fetchedArticles } = usePatientNews()
  const articles = Array.isArray(articlesProp)
    ? articlesProp
    : Array.isArray(fetchedArticles)
      ? fetchedArticles
      : []
  const visible = useMemo(() => articles.slice(0, 3), [articles])

  if (visible.length === 0) {
    return null
  }

  return (
    <>
      {selectedNews ? (
        <HealthNewsModal item={selectedNews} onClose={() => setSelectedNews(null)} />
      ) : null}

      <View>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Health News</Text>
          <Text style={styles.liveFeed}>Live Feed</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          snapToInterval={CARD_WIDTH + 16}
          decelerationRate="fast"
        >
          {visible.map((item, index) => {
            const theme = CARD_THEMES[index] ?? CARD_THEMES[2]
            const snippetText = getSnippet(item.body)
            const isFirst = index === 0

            return (
              <Pressable
                key={item.id}
                style={[
                  styles.card,
                  {
                    width: Math.min(CARD_WIDTH, width - 48),
                    backgroundColor: theme.backgroundColor,
                    borderColor: theme.borderColor,
                  },
                ]}
                onPress={() => setSelectedNews(item)}
              >
                <View style={styles.cardArrow}>
                  <ArrowIcon color={theme.arrowColor} />
                </View>

                <Text
                  style={[
                    styles.cardTitle,
                    {
                      color: theme.titleColor,
                      fontSize: isFirst ? 15 : 13,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>

                {snippetText ? (
                  <Text
                    style={[styles.cardSnippet, { color: theme.snippetColor }]}
                    numberOfLines={isFirst ? 3 : 2}
                  >
                    {snippetText}
                  </Text>
                ) : null}

                <View style={[styles.cardFooter, { borderTopColor: theme.dividerColor }]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.sourceLabel, { color: theme.sourceLabelColor }]}>
                      Verified Source
                    </Text>
                    <Text style={[styles.sourceName, { color: theme.sourceColor }]} numberOfLines={1}>
                      {item.source}
                    </Text>
                  </View>
                  <View style={[styles.dateBadge, { backgroundColor: theme.dateBg }]}>
                    <Text style={[styles.dateText, { color: theme.dateColor }]}>
                      {formatDate(item.date, { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: fontWeights.bold,
    fontSize: 16,
    color: colors.text,
    letterSpacing: -0.3,
  },
  liveFeed: {
    fontFamily: fontWeights.bold,
    fontSize: 12,
    color: colors.blueInk,
  },
  carousel: {
    gap: 16,
    paddingBottom: 8,
    paddingRight: 4,
  },
  card: {
    borderRadius: radii.large,
    borderWidth: 1,
    padding: 20,
    minHeight: 220,
    ...shadows.card,
  },
  cardArrow: {
    alignItems: 'flex-end',
    marginBottom: 14,
    opacity: 0.65,
  },
  cardTitle: {
    fontFamily: fontWeights.bold,
    lineHeight: 21,
    marginBottom: 10,
  },
  cardSnippet: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    lineHeight: 19,
    flex: 1,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 'auto',
    gap: 8,
  },
  sourceLabel: {
    fontFamily: fontWeights.bold,
    fontSize: 12,
    marginBottom: 2,
  },
  sourceName: {
    fontFamily: fontWeights.bold,
    fontSize: 11,
  },
  dateBadge: {
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  dateText: {
    fontFamily: fontWeights.bold,
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8,21,40,0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden',
    ...shadows.raised,
  },
  modalHeader: {
    backgroundColor: colors.navy,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  modalHeaderDeco: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(47,155,255,0.06)',
  },
  modalCloseBtn: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fontWeights.bold,
  },
  modalHeaderTitle: {
    fontFamily: fontWeights.extraBold,
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  modalSourceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalSourceIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSourceIconGlyph: {
    color: colors.blueInk,
    fontSize: 14,
  },
  modalSourceLabel: {
    fontFamily: fontWeights.regular,
    fontSize: 11,
    color: colors.textSub,
    marginBottom: 2,
  },
  modalSourceName: {
    fontFamily: fontWeights.bold,
    fontSize: 13,
    color: colors.text,
  },
  modalSourceDate: {
    fontFamily: fontWeights.regular,
    fontSize: 11,
    color: colors.textSub,
    marginTop: 1,
  },
  modalVisitBtn: {
    backgroundColor: colors.navy,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  modalVisitText: {
    fontFamily: fontWeights.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingTop: 24,
    maxHeight: 320,
  },
  modalParagraph: {
    fontFamily: fontWeights.regular,
    fontSize: 14,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
})


